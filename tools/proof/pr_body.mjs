#!/usr/bin/env node
// PR description proof (multi-ticket stale rule).
//
// Proof kind is `ui` or `non-ui`. A `Proof kind:` line in the body sets it.
// Missing means ui. `--proof-kind` overrides that line (the gate passes
// proof.json `proofKind`). If the body declares a different kind, the check fails.
//
// ui: two different image embeds (markdown `![alt](url)` or HTML `<img>`),
// one whose alt text or file name contains "desktop" and one that contains
// "390", plus an http(s) preview link that is not one of those images.
// A plain link, autolink or bare URL never counts as a shot. A shot whose
// alt text or file name says output, test, terminal or code does not count.
//
// non-ui: a `Result:` line with text, plus at least one http(s) link that is
// not an image. An embedded image labelled output, test, terminal or code fails.
// Other images are allowed.
//
// Fenced code, inline code, and HTML comments are ignored.
//
//   node pr_body.mjs --body-file <markdown> [--proof-kind ui|non-ui]
//   node pr_body.mjs --github-event "$GITHUB_EVENT_PATH"
//   node pr_body.mjs --body-env PR_BODY
// Exit 0 on pass, 1 on fail, 2 on usage or read errors.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stdin } from 'node:process';

const KINDS = new Set(['ui', 'non-ui']);
const IMG_FILE = /\.(png|jpe?g|webp|avif|gif)$/i;
const BAD_LABEL = /(^|[^a-z0-9])(output|tests?|terminal|code)([^a-z0-9]|$)/i;

const DESKTOP_MSG = 'missing a desktop screenshot: a markdown image or img tag whose alt text or file name contains "desktop"';
const MOBILE_MSG = 'missing a 390px screenshot: a markdown image or img tag whose alt text or file name contains "390"';
const BOTH_MSG = 'desktop and 390 are both on the same screenshot. Use two different images';
const BAD_SHOT_MSG = 'a shot labelled output, test, terminal or code does not count as a UI shot';
const PREVIEW_MSG = 'missing a clickable preview URL: an http or https link that is not one of the screenshots';
const RESULT_MSG = 'non-ui body is missing a Result: line with non-empty text';
const LINK_MSG = 'non-ui body is missing an http or https link that is not an image';
const NON_UI_IMAGE_MSG = 'non-ui body embeds an image labelled output, test, terminal or code';

function stripPassive(text) {
  return String(text ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

function attr(tag, name) {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = tag.match(re);
  return m ? (m[2] ?? m[3] ?? m[4] ?? '') : '';
}

function fileName(url) {
  const seg = url.pathname.split('/').filter(Boolean).pop() ?? '';
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

function classify(text, rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const filename = fileName(url);
  const hay = `${text}\n${filename}`;
  return {
    text,
    url: url.href,
    filename,
    desktop: /desktop/i.test(hay),
    mobile390: /390/.test(hay),
    badLabel: BAD_LABEL.test(hay),
  };
}

function pull(src, re, onMatch) {
  return src.replace(re, (...args) => {
    onMatch(args);
    return ' ';
  });
}

function readDeclaredKind(src) {
  const m = src.match(/^[ \t]*proof kind:[ \t]*(\S+)[ \t]*$/im);
  if (!m) return { kind: null, unknown: null };
  const v = m[1].toLowerCase();
  if (KINDS.has(v)) return { kind: v, unknown: null };
  return { kind: null, unknown: m[1] };
}

function resultLine(src) {
  const m = src.match(/^[ \t]*Result:[ \t]*(.*)$/im);
  if (!m) return null;
  const text = m[1].trim();
  return text || null;
}

/** @returns {{ ok: boolean, errors: string[], kind: string, declaredKind: string|null, desktop: boolean, mobile390: boolean, output: boolean, preview: string|null, result: string|null, link: string|null }} */
export function checkPrBody(body, { proofKind } = {}) {
  const errors = [];
  let src = stripPassive(body);
  const declared = readDeclaredKind(src);
  if (declared.unknown) errors.push(`unknown proof kind "${declared.unknown}". Use ui or non-ui`);
  if (proofKind && !KINDS.has(proofKind)) errors.push(`unknown proof kind "${proofKind}". Use ui or non-ui`);
  if (proofKind && declared.kind && proofKind !== declared.kind) {
    errors.push(`Proof kind in the body is ${declared.kind} but proof.json says ${proofKind}`);
  }
  const kind = proofKind && KINDS.has(proofKind) ? proofKind : (declared.kind ?? 'ui');

  const items = [];
  src = pull(src, /<img\b[^>]*>/gi, ([full]) => {
    items.push({ kind: 'img', text: attr(full, 'alt'), url: attr(full, 'src') });
  });
  src = pull(src, /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g, ([, alt, url]) => {
    items.push({ kind: 'image', text: alt ?? '', url: url ?? '' });
  });
  src = pull(src, /(?<!!)\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g, ([, text, url]) => {
    items.push({ kind: 'link', text: text ?? '', url: url ?? '' });
  });
  src = pull(src, /<(https?:\/\/[^>\s]+)>/g, ([, url]) => {
    items.push({ kind: 'autolink', text: '', url: url ?? '' });
  });
  src = pull(src, /https?:\/\/[^\s<>)\]]+/g, ([full]) => {
    items.push({ kind: 'bare', text: '', url: full.replace(/[.,;:!?]+$/g, '') });
  });

  const images = [];
  const links = [];
  for (const item of items) {
    const info = classify(item.text, item.url);
    if (!info) continue;
    if (item.kind === 'img' || item.kind === 'image') images.push(info);
    else links.push(info);
  }

  if (kind === 'non-ui') {
    const result = resultLine(stripPassive(body));
    if (!result) errors.push(RESULT_MSG);
    const badImages = images.filter((s) => s.badLabel);
    if (badImages.length) errors.push(NON_UI_IMAGE_MSG);
    const imageUrls = new Set(images.map((s) => s.url));
    const plain = links.filter((p) => !imageUrls.has(p.url));
    if (!plain.length) errors.push(LINK_MSG);
    return {
      ok: errors.length === 0,
      errors,
      kind,
      declaredKind: declared.kind,
      desktop: false,
      mobile390: false,
      output: badImages.length > 0,
      preview: plain[0]?.url ?? null,
      result,
      link: plain[0]?.url ?? null,
    };
  }

  const qualifying = images.filter((s) => !s.badLabel);
  const desktopRefs = qualifying.filter((s) => s.desktop);
  const mobileRefs = qualifying.filter((s) => s.mobile390);
  const paired = desktopRefs.some((d) => mobileRefs.some((m) => m !== d));
  const ignored = images.some((s) => s.badLabel && (s.desktop || s.mobile390 || s.badLabel));

  if (!paired) {
    if (desktopRefs.length && mobileRefs.length) errors.push(BOTH_MSG);
    else {
      if (!desktopRefs.length) errors.push(DESKTOP_MSG);
      if (!mobileRefs.length) errors.push(MOBILE_MSG);
    }
    if (ignored) errors.push(BAD_SHOT_MSG);
  }

  const shotUrls = new Set(qualifying.filter((s) => s.desktop || s.mobile390).map((s) => s.url));
  // A link to a screenshot file, or one whose text names a shot, is not a preview.
  const shotLike = (p) => IMG_FILE.test(p.filename) || /desktop|390/i.test(p.text);
  const previewLinks = links.filter((p) => !shotUrls.has(p.url) && !shotLike(p));
  if (!previewLinks.length) errors.push(PREVIEW_MSG);

  return {
    ok: errors.length === 0,
    errors,
    kind,
    declaredKind: declared.kind,
    desktop: paired,
    mobile390: paired,
    output: images.some((s) => s.badLabel),
    preview: previewLinks[0]?.url ?? null,
    result: resultLine(stripPassive(body)),
    link: previewLinks[0]?.url ?? null,
  };
}

function usage() {
  return [
    'usage: node pr_body.mjs --body-file <markdown> [--proof-kind ui|non-ui]',
    '       node pr_body.mjs --github-event <event.json> [--proof-kind ui|non-ui]',
    '       node pr_body.mjs --body-env <NAME> [--proof-kind ui|non-ui]',
    '       node pr_body.mjs [--proof-kind ui|non-ui]   (markdown on stdin)',
  ].join('\n');
}

async function readStdin() {
  // readFileSync(0) throws EAGAIN when the pipe writer is slower than node (gh ... | node pr_body.mjs).
  const chunks = [];
  for await (const chunk of stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function readBody(argv) {
  const opt = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : null;
  };
  const file = opt('--body-file');
  if (file) return readFileSync(file, 'utf8');
  const envName = opt('--body-env');
  if (envName) return process.env[envName] ?? '';
  const eventPath = opt('--github-event');
  if (eventPath) {
    const event = JSON.parse(readFileSync(eventPath, 'utf8'));
    return event.pull_request?.body ?? '';
  }
  if (stdin.isTTY) {
    const err = new Error(usage());
    err.code = 'USAGE';
    throw err;
  }
  return readStdin();
}

export function reportBody(result) {
  const lines = [`PR BODY PROOF: ${result.ok ? 'PASS' : 'FAIL'}`];
  lines.push(`  kind: ${result.kind}`);
  if (result.ok && result.kind === 'non-ui') {
    lines.push(`  result: ${result.result}`);
    lines.push(`  link: ${result.link ?? 'none'}`);
  } else if (result.ok) {
    lines.push(`  desktop: ${result.desktop ? 'yes' : 'no'}`);
    lines.push(`  390px: ${result.mobile390 ? 'yes' : 'no'}`);
    lines.push(`  preview: ${result.preview ?? 'none'}`);
  } else {
    for (const e of result.errors) lines.push(`  FAIL  ${e}`);
  }
  return lines.join('\n');
}

async function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage());
    return 0;
  }
  const kindFlag = (() => {
    const i = argv.indexOf('--proof-kind');
    return i >= 0 ? argv[i + 1] : null;
  })();
  if (argv.includes('--proof-kind') && !KINDS.has(kindFlag)) {
    console.error('pr_body: --proof-kind must be ui or non-ui');
    return 2;
  }
  let body;
  try {
    body = await readBody(argv);
  } catch (e) {
    console.error(e.code === 'USAGE' ? e.message : `pr_body: ${e.message}`);
    return 2;
  }
  const result = checkPrBody(body, kindFlag ? { proofKind: kindFlag } : {});
  console.log(reportBody(result));
  return result.ok ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
