# proof tools

Generic proof.json tooling. A ticket is done when `proof_gate.mjs` passes.
Target repos carry a copy of `validate.mjs`, `proof.schema.json`, `validate.test.mjs`, `pr_body.mjs`, `pr_body.test.mjs` and `fixtures/pr-body/` in `scripts/proof/`. Keep them in sync with `proof.yml.template`.

Files
- `proof.schema.json`: schemaVersion 1 (JSON Schema 2020-12).
- `validate.mjs`: zero-dependency validator. `node validate.mjs proof/ABC-123/proof.json`
- `validate.test.mjs`: `node --test validate.test.mjs` (Node 22 takes files or globs, not directories).
- `pr_body.mjs`: checks the PR description. ui needs desktop and 390px image embeds plus a preview link. non-ui needs a Result line plus a link, and fails on shots of output, tests, a terminal, or code. `node --test pr_body.test.mjs`.
- `stale.mjs`: shared stale-proof check for the gate (GitHub compare) and CI (`validate.mjs --head`, local git diff).
- `make_proof.py`: takes the screenshots, runs checks, writes proof.json, validates it. Needs python playwright + chromium.
- `proof_gate.mjs`: the done gate. Also builds the Linear plan. See `linear_push.md`. When `proof.pr` is set, the gate also runs the PR body check.

Generate
    python3 make_proof.py --ticket ABC-123 --repo-dir <repo> --base-url <url> [--routes / /foo] [--kind ...] [--skip-checks] [--proof-kind non-ui --result "<line>"]
Reads `<repo>/proof.config.json`: `kind`, `routes`, `waitFor`, `checks[{name, command}]`, `auth.storageState`, `strictConsole`.
Writes `<repo>/proof/<TICKET>/` (desktop 1440x900 and mobile 390x844 at dpr 2). Shots are true full page: the generator measures the real content height (document or the tallest self-scrolling element), unlocks html/body and the main scroll container when the page scrolls inside one, falls back to resizing the viewport, and caps at 16000 css px..
For hosts ending in `$PREVIEW_HOST_SUFFIX` (default `.preview.example.com`) set `PREVIEW_BYPASS_FILE=<file with the bypass token>`. The token is sent as a header and never stored.

Gate
    node proof_gate.mjs ABC-123 <repo>/proof/ABC-123/proof.json [--max-age-days 7] [--linear-plan plan.json] [--push-linear]

PR body (multi-ticket stale rule)
CI runs this on every pull request (`proof.yml.template`). `proof_gate.mjs` runs it when the proof names a PR. The body declares `Proof kind: ui` or `Proof kind: non-ui`. Missing means ui. proof.json uses `proofKind` (its `kind` field is the repo type). If the two disagree, the check fails.

ui
1. A desktop image embed (markdown image or HTML `img`).
2. A 390px image embed. Two different images. A plain link does not count.
3. A clickable preview link, `http` or `https`, that is not one of the shots.

The alt text or the file name must contain `desktop` or `390`. A marker in the query string does not count. One image labeled both does not count as two shots. A shot labelled output, test, terminal or code does not count as a UI shot.

non-ui
1. A line `Result:` with the check output (for example `node --test 36/36`).
2. At least one http or https link (PR, CI run, preview or live).
3. No image whose alt text or file name says output, test, terminal or code. Other images, such as a diagram, are allowed.

proof.json `proofKind: non-ui` may have an empty `screenshots` array. It needs a non-empty `result` and at least one of `pr.url`, `urls.preview` or `urls.live`. Checks must still exit 0.

    node pr_body.mjs --body-file pr.md
    node pr_body.mjs --github-event "$GITHUB_EVENT_PATH" --proof-kind non-ui
    node validate.mjs --head "$HEAD_SHA" proof/ABC-123/proof.json

Usage per kind
- web-app: public routes only (no login). Preview URL from the PR's preview deploy check. Commit `proof/<TICKET>/` last on the PR branch.
- preview-site: routes like `/preview/<slug>.html`. Preview is protected, use `PREVIEW_BYPASS_FILE`. Same commit rule.
- hosted-theme: a hosted preview with no repo of its own. Use `--kind hosted-theme`. Proof lives in `<workdir>/tasks/<slug>/proof/<TICKET>/`. With no repo, proof.json has `repo: "none"`, `pr: null`, `commitSha: null`.
- generic: any URL. Fill the checks in the config.
