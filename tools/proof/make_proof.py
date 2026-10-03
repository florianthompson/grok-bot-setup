#!/usr/bin/env python3
"""Generate proof/<TICKET>/proof.json: screenshots, checks, console errors, git + PR facts.

Usage:
  python3 make_proof.py --ticket ABC-123 --repo-dir . --base-url https://pr-123.preview.example.com \
      [--config proof.config.json] [--routes / /foo] [--out proof/ABC-123] \
      [--kind web-app|preview-site|hosted-theme|generic] [--skip-checks] \
      [--proof-kind ui|non-ui] [--result "<line>"]

proof.config.json (in repo-dir): {kind, routes[], waitFor{route: selector}, checks[{name, command}],
  auth{storageState}, strictConsole, createdBy}
If the base URL is *<PREVIEW_HOST_SUFFIX> (default .preview.example.com) and PREVIEW_BYPASS_FILE points at a file holding the preview
protection bypass token, it is sent as x-preview-bypass. It is never written anywhere.
"""
import argparse, datetime, json, os, re, struct, subprocess, sys, time
from pathlib import Path
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent
MAX_CSS_HEIGHT = 16000  # css px
VIEWPORTS = {
    "desktop": dict(width=1440, height=900, dpr=1, mobile=False),
    "mobile390": dict(width=390, height=844, dpr=2, mobile=True),
}
PREVIEW_SUFFIX = os.environ.get("PREVIEW_HOST_SUFFIX", ".preview.example.com")
LOGIN_WALL_HOST = os.environ.get("LOGIN_WALL_HOST", "login.example.com")
KINDS = ["web-app", "preview-site", "hosted-theme", "generic"]


def run(cmd, cwd=None, shell=False):
    return subprocess.run(cmd, cwd=cwd, shell=shell, capture_output=True, text=True)


def scrub(text, secrets):
    for s in secrets:
        if s:
            text = text.replace(s, "[redacted]")
    # common secret shapes
    text = re.sub(r"(?i)([?&](?:sentry_key|key|token|access_token)=)[^&\s]+", r"\1[redacted]", text)
    text = re.sub(r"(?i)(token|secret|password|api[_-]?key|authorization)(\s*[=:]\s*)\S+", r"\1\2[redacted]", text)
    return text


def tail(text, n=15):
    lines = [l.rstrip() for l in text.strip().splitlines()]
    return "\n".join(lines[-n:])


def slug(route):
    s = re.sub(r"[^A-Za-z0-9]+", "-", route).strip("-")
    return s or "home"


def png_size(p):
    with open(p, "rb") as f:
        h = f.read(24)
    return struct.unpack(">II", h[16:24])


def shrink_png(path, limit=1_500_000):
    """Lossless re-encode with Pillow when available. Never changes the pixel size."""
    try:
        from PIL import Image
    except ImportError:
        return
    if path.stat().st_size <= limit:
        return
    im = Image.open(path)
    im.save(path, optimize=True, compress_level=9)
    if path.stat().st_size > limit:
        print(f"warn: {path.name} is {path.stat().st_size // 1024} KB, over the {limit // 1000} KB target", file=sys.stderr)


def git_facts(repo_dir):
    branch = run(["git", "rev-parse", "--abbrev-ref", "HEAD"], repo_dir).stdout.strip()
    sha = run(["git", "rev-parse", "HEAD"], repo_dir).stdout.strip()
    remote = run(["git", "config", "--get", "remote.origin.url"], repo_dir).stdout.strip()
    m = re.search(r"github\.com[:/]([^/]+/[^/]+?)(?:\.git)?$", remote)
    repo = m.group(1) if m else "none"
    r = run(["gh", "pr", "view", "--json", "url,number,state,isDraft,mergedAt"], repo_dir)
    pr = None
    if r.returncode == 0:
        d = json.loads(r.stdout)
        pr = dict(url=d["url"], number=d["number"], state=d["state"], isDraft=d["isDraft"],
                  merged=d["state"] == "MERGED", mergedAt=d.get("mergedAt") or None)
    return branch, sha, repo, pr


# Largest height the page can show: the document, or the tallest element that scrolls on its own.
MEASURE_JS = """() => {
  const de = document.documentElement, b = document.body;
  let h = Math.max(de.scrollHeight, b ? b.scrollHeight : 0), main = 0;
  for (const e of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(e);
    if (!/(auto|scroll|overlay)/.test(cs.overflowY) || e.scrollHeight <= e.clientHeight + 1) continue;
    h = Math.max(h, Math.round(e.getBoundingClientRect().top + window.scrollY + e.scrollHeight));
    if (e.clientHeight >= innerHeight * 0.5 && e.clientWidth >= innerWidth * 0.5) main += 1;
  }
  return { height: Math.ceil(h), doc: Math.ceil(de.scrollHeight), mainScrollers: main, inner: innerHeight };
}"""

# Lets the page grow to its content: html/body and any element that is the main scroller.
UNLOCK_JS = """() => {
  const st = document.createElement('style');
  st.textContent = 'html,body{height:auto!important;min-height:0!important;overflow:visible!important}';
  document.head.appendChild(st);
  for (const e of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(e);
    if (!/(auto|scroll|overlay)/.test(cs.overflowY) || e.scrollHeight <= e.clientHeight + 1) continue;
    if (e.clientHeight < innerHeight * 0.5 || e.clientWidth < innerWidth * 0.5) continue;
    e.style.setProperty('height', 'auto', 'important');
    e.style.setProperty('max-height', 'none', 'important');
    e.style.setProperty('overflow', 'visible', 'important');
  }
}"""


def full_page_shot(page, path, vp, notes):
    """True full-page capture. Measures the real content height, unlocks scroll containers when
    the page scrolls inside one (or shows only one screen), then shoots; if the file still comes
    out short, resizes the viewport to the content height. Capped at MAX_CSS_HEIGHT css px."""
    # Scroll through once so lazy images and reveal-on-scroll sections have laid out.
    page.evaluate("async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } window.scrollTo(0, 0); }")
    page.wait_for_timeout(300)
    m = page.evaluate(MEASURE_JS)
    if m["mainScrollers"] or m["doc"] <= m["inner"] + 1:
        page.evaluate(UNLOCK_JS)
        page.wait_for_timeout(300)
        m2 = page.evaluate(MEASURE_JS)
        notes.append(f"unlocked scroll containers: {m['doc']} -> {m2['doc']} css px (measured {m['height']})")
        m = dict(m2, height=max(m["height"], m2["height"]))
    want = min(m["height"], MAX_CSS_HEIGHT)
    if m["height"] > MAX_CSS_HEIGHT:
        notes.append(f"content is {m['height']} css px, capped at {MAX_CSS_HEIGHT}")
    page.screenshot(path=str(path), full_page=True, clip=dict(x=0, y=0, width=vp["width"], height=want))
    w, h = png_size(path)
    if h < want * vp["dpr"] * 0.98:
        notes.append(f"shot is {h} px for {want} css px expected, retrying with the viewport resized to the content")
        page.set_viewport_size(dict(width=vp["width"], height=want))
        page.wait_for_timeout(300)
        page.screenshot(path=str(path), full_page=True, clip=dict(x=0, y=0, width=vp["width"], height=want))
        w, h = png_size(path)
        if h < want * vp["dpr"] * 0.98:
            notes.append(f"WARNING: shot is still only {h} px tall, expected about {want * vp['dpr']}")
    return want


def capture(args, cfg, routes, out, secrets):
    from playwright.sync_api import sync_playwright
    base = args.base_url.rstrip("/")
    headers = {}
    bypass_file = os.environ.get("PREVIEW_BYPASS_FILE")
    if urlparse(base).hostname and urlparse(base).hostname.endswith(PREVIEW_SUFFIX) and bypass_file:
        tok = Path(bypass_file).read_text().strip()
        headers["x-preview-bypass"] = tok
        secrets.append(tok)
    storage = (cfg.get("auth") or {}).get("storageState")
    if storage:
        storage = str((Path(args.repo_dir) / storage).resolve())
    shots, errors = [], []
    wait_for = cfg.get("waitFor", {})
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for vname, vp in VIEWPORTS.items():
            kw = dict(viewport=dict(width=vp["width"], height=vp["height"]), device_scale_factor=vp["dpr"],
                      is_mobile=vp["mobile"], has_touch=vp["mobile"], extra_http_headers=headers)
            if storage:
                kw["storage_state"] = storage
            ctx = browser.new_context(**kw)
            for route in routes:
                page = ctx.new_page()
                page.on("console", lambda m, r=route, v=vname: m.type == "error" and errors.append(
                    dict(route=r, viewport=v, text=scrub(m.text, secrets)[:500])))
                page.on("pageerror", lambda e, r=route, v=vname: errors.append(
                    dict(route=r, viewport=v, text=scrub(str(e), secrets)[:500])))
                resp = page.goto(base + route, wait_until="networkidle", timeout=60000)
                host = urlparse(page.url).hostname or ""
                if host.endswith(LOGIN_WALL_HOST) or (resp is not None and resp.status in (401, 403) and "Authentication Required" in page.title()):
                    sys.exit(f"ABORT: {base + route} sits behind a hosting login wall (landed on {host}). "
                             "Set PREVIEW_BYPASS_FILE for a protected preview or use the production URL. "
                             "A login page is not proof.")
                if resp is not None and resp.status >= 400:
                    errors.append(dict(route=route, viewport=vname, text=f"HTTP {resp.status} for {route}"))
                sel = wait_for.get(route) or wait_for.get("*")
                if sel:
                    page.wait_for_selector(sel, timeout=30000)
                page.wait_for_timeout(500)
                fname = f"{vname}-{slug(route)}.png"
                path = out / fname
                notes = []
                full_page_shot(page, path, vp, notes)
                for n in notes:
                    print(f"shot {fname}: {n}", file=sys.stderr)
                shrink_png(path)
                w, h = png_size(path)
                shots.append(dict(path=fname, viewport=vname, width=w, height=h,
                                  deviceScaleFactor=vp["dpr"], route=route))
                page.close()
            ctx.close()
        browser.close()
    return shots, errors


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ticket", required=True)
    ap.add_argument("--repo-dir", required=True)
    ap.add_argument("--base-url", required=True)
    ap.add_argument("--config")
    ap.add_argument("--routes", nargs="+")
    ap.add_argument("--out")
    ap.add_argument("--kind", choices=KINDS)
    ap.add_argument("--proof-kind", choices=["ui", "non-ui"], default=None)
    ap.add_argument("--result", default=None)
    ap.add_argument("--skip-checks", action="store_true")
    ap.add_argument("--created-by", default=None)
    args = ap.parse_args()
    proof_kind = args.proof_kind or "ui"
    if proof_kind == "non-ui" and not (args.result and args.result.strip()):
        print("non-ui proof needs --result", file=sys.stderr)
        sys.exit(2)

    repo_dir = Path(args.repo_dir).resolve()
    cfg_path = Path(args.config) if args.config else repo_dir / "proof.config.json"
    cfg = json.loads(cfg_path.read_text()) if cfg_path.exists() else {}
    kind = args.kind or cfg.get("kind") or "generic"
    routes = args.routes or cfg.get("routes") or ["/"]
    out = Path(args.out) if args.out else repo_dir / "proof" / args.ticket
    if args.out and not out.is_absolute():
        out = repo_dir / out
    out.mkdir(parents=True, exist_ok=True)
    secrets = []

    if proof_kind == "non-ui":
        shots, errors = [], []
    else:
        shots, errors = capture(args, cfg, routes, out, secrets)

    checks = []
    if not args.skip_checks:
        for c in cfg.get("checks", []):
            t0 = time.time()
            r = run(c["command"], cwd=str(repo_dir), shell=True)
            checks.append(dict(name=c["name"], command=c["command"], exitCode=r.returncode,
                               durationMs=int((time.time() - t0) * 1000),
                               summary=scrub(tail(r.stdout + "\n" + r.stderr), secrets)))

    branch, sha, repo, pr = git_facts(str(repo_dir))
    host = urlparse(args.base_url).hostname or ""
    is_preview = host.endswith(PREVIEW_SUFFIX)
    urls = dict(preview=args.base_url if is_preview else None, live=None if is_preview else args.base_url)
    proof = {
        "schemaVersion": 1, "ticket": args.ticket, "repo": repo, "kind": kind, "branch": branch,
        "commitSha": sha, "pr": pr, "urls": urls, "screenshots": shots, "checks": checks,
        "console": {"errors": errors},
        "createdAt": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "createdBy": args.created_by or cfg.get("createdBy") or "claude",
    }
    if proof_kind == "non-ui":
        proof["proofKind"] = "non-ui"
        proof["result"] = args.result.strip()
    elif args.proof_kind == "ui":
        proof["proofKind"] = "ui"
    (out / "proof.json").write_text(json.dumps(proof, indent=2) + "\n")
    print(f"wrote {out / 'proof.json'}: {len(shots)} screenshots, {len(checks)} checks, {len(errors)} console errors")

    v = run(["node", str(HERE / "validate.mjs"), str(out / "proof.json")])
    sys.stdout.write(v.stdout)
    sys.stderr.write(v.stderr)
    sys.exit(0 if v.returncode == 0 else 1)


if __name__ == "__main__":
    main()
