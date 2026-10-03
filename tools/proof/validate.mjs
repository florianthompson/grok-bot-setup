#!/usr/bin/env node
// Zero-dependency validator for proof.json (schemaVersion 1). Node 22+, ESM.
// Usage: node validate.mjs <proof.json>...   (exit 1 with messages on failure)
import { readFileSync, existsSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { changedFilesBetween, formatStale, localProofExists, staleFindings } from './stale.mjs';

const SCHEMA_PATH = resolve(dirname(fileURLToPath(import.meta.url)), 'proof.schema.json');
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

const typeOf = (v) =>
  v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v;
const isType = (v, t) => (t === 'number' ? typeof v === 'number' && Number.isFinite(v) : typeOf(v) === t);
const show = (v) => (typeof v === 'string' ? JSON.stringify(v.length > 60 ? v.slice(0, 57) + '...' : v) : JSON.stringify(v));

// Minimal interpreter for the JSON Schema subset used by proof.schema.json.
function check(schema, value, path, errors) {
  if ('const' in schema && value !== schema.const) {
    errors.push(`${path}: must be ${show(schema.const)}, got ${show(value)}`);
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: must be one of ${schema.enum.map(show).join(', ')}, got ${show(value)}`);
    return;
  }
  if (schema.type) {
    const types = [].concat(schema.type);
    if (!types.some((t) => isType(value, t))) {
      errors.push(`${path}: expected ${types.join(' or ')}, got ${typeOf(value)}`);
      return;
    }
  }
  if (typeof value === 'string') {
    if (schema.minLength != null && value.length < schema.minLength) errors.push(`${path}: must not be empty`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path}: ${show(value)} does not match ${schema.pattern}`);
    }
    if (schema.format === 'date-time' && (!ISO_DATE_TIME.test(value) || Number.isNaN(Date.parse(value)))) {
      errors.push(`${path}: ${show(value)} is not an ISO-8601 date-time with offset`);
    }
  }
  if (typeof value === 'number') {
    if (schema.minimum != null && value < schema.minimum) errors.push(`${path}: must be >= ${schema.minimum}, got ${value}`);
    if (schema.exclusiveMinimum != null && value <= schema.exclusiveMinimum) errors.push(`${path}: must be > ${schema.exclusiveMinimum}, got ${value}`);
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, i) => check(schema.items, item, `${path}[${i}]`, errors));
  }
  if (typeOf(value) === 'object') {
    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${path === '$' ? '' : path + '.'}${key}: required field is missing`);
    }
    const props = schema.properties ?? {};
    for (const [key, v] of Object.entries(value)) {
      const here = path === '$' ? key : `${path}.${key}`;
      if (props[key]) check(props[key], v, here, errors);
      else if (schema.additionalProperties === false) errors.push(`${here}: unknown field`);
    }
  }
}

function pngSize(file) {
  const fd = openSync(file, 'r');
  try {
    const buf = Buffer.alloc(24);
    const n = readSync(fd, buf, 0, 24, 0);
    if (n < 24 || buf.readUInt32BE(0) !== 0x89504e47 || buf.toString('ascii', 12, 16) !== 'IHDR') return null;
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  } finally {
    closeSync(fd);
  }
}

/** Validate a parsed proof object. Returns { ok, errors[] }. */
export function validateProof(obj, { baseDir = process.cwd(), checkFiles = false } = {}) {
  const errors = [];
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
  check(schema, obj, '$', errors);
  if (typeOf(obj) !== 'object') return { ok: false, errors };
  const hostedTheme = obj.kind === 'hosted-theme';

  // Cross-field rules. Skip a rule when its inputs already failed the shape check.
  if (obj.pr === null && !hostedTheme) errors.push('pr: may only be null for kind hosted-theme');
  if (obj.commitSha === null && !(hostedTheme && obj.repo === 'none')) {
    errors.push('commitSha: may only be null for kind hosted-theme with repo "none"');
  }
  const proofKind = obj.proofKind ?? 'ui';
  if (obj.urls && typeOf(obj.urls) === 'object') {
    const hasPreview = Boolean(obj.urls.preview) || Boolean(obj.urls.live);
    const hasPr = Boolean(obj.pr && obj.pr.url);
    if (proofKind === 'non-ui') {
      if (!hasPreview && !hasPr) errors.push('non-ui: at least one of pr.url, urls.preview or urls.live must be set');
    } else if (!hasPreview) {
      errors.push('urls: at least one of preview or live must be set');
    }
  }
  if (proofKind === 'non-ui' && (typeof obj.result !== 'string' || !obj.result.trim())) {
    errors.push('result: non-ui proof needs a non-empty result');
  }
  if (obj.pr && obj.pr.merged !== undefined && obj.pr.merged !== (obj.pr.state === 'MERGED')) {
    errors.push('pr.merged: must be true exactly when pr.state is MERGED');
  }

  const shots = Array.isArray(obj.screenshots) ? obj.screenshots : [];
  if (Array.isArray(obj.screenshots) && proofKind !== 'non-ui') {
    if (!shots.some((s) => s?.viewport === 'desktop')) errors.push('screenshots: at least one desktop screenshot is required');
    if (!shots.some((s) => s?.viewport === 'mobile390')) errors.push('screenshots: at least one mobile390 screenshot is required (390px wide viewport)');
  }
  shots.forEach((s, i) => {
    if (typeOf(s) !== 'object') return;
    const at = `screenshots[${i}]`;
    const dpr = s.deviceScaleFactor;
    if (typeof dpr === 'number' && typeof s.width === 'number') {
      if (s.viewport === 'mobile390' && s.width !== 390 * dpr) {
        errors.push(`${at}.width: mobile390 width must be 390 x deviceScaleFactor (${390 * dpr}), got ${s.width}`);
      }
      if (s.viewport === 'desktop' && s.width < 1280 * dpr) {
        errors.push(`${at}.width: desktop width must be >= 1280 x deviceScaleFactor (${1280 * dpr}), got ${s.width}`);
      }
    }
    if (checkFiles && typeof s.path === 'string' && s.path) {
      const abs = resolve(baseDir, s.path);
      const rel = relative(resolve(baseDir), abs);
      if (isAbsolute(s.path) || rel.startsWith('..')) {
        errors.push(`${at}.path: ${show(s.path)} must be relative and stay inside the proof directory`);
      } else if (!existsSync(abs) || !statSync(abs).isFile()) {
        errors.push(`${at}.path: file ${show(s.path)} does not exist in ${baseDir}`);
      } else if (abs.toLowerCase().endsWith('.png')) {
        const size = pngSize(abs);
        if (!size) errors.push(`${at}.path: ${show(s.path)} is not a valid PNG`);
        else {
          if (size.width !== s.width || size.height !== s.height) {
            errors.push(`${at}: declared ${s.width}x${s.height} but PNG is ${size.width}x${size.height}`);
          }
          if (s.viewport === 'mobile390' && typeof dpr === 'number' && size.width !== 390 * dpr) {
            errors.push(`${at}: real PNG width ${size.width} is not 390 x ${dpr}`);
          }
          if (s.viewport === 'desktop' && typeof dpr === 'number' && size.width < 1280 * dpr) {
            errors.push(`${at}: real PNG width ${size.width} is below 1280 x ${dpr}`);
          }
        }
      }
    }
  });

  (Array.isArray(obj.checks) ? obj.checks : []).forEach((c, i) => {
    if (typeOf(c) === 'object' && Number.isInteger(c.exitCode) && c.exitCode !== 0) {
      errors.push(`checks[${i}] (${c.name}): failed, exitCode ${c.exitCode}`);
    }
  });

  const m = resolve(baseDir).split(sep).join('/').match(/(?:^|\/)proof\/([A-Z][A-Z0-9]*-\d+)$/);
  if (m && typeof obj.ticket === 'string' && obj.ticket !== m[1]) {
    errors.push(`ticket: ${obj.ticket} does not match directory proof/${m[1]}/`);
  }
  return { ok: errors.length === 0, errors };
}

/** Stale check for CI: local git diff from proof.commitSha to headSha. */
export function staleErrors(obj, headSha, cwd) {
  if (obj?.commitSha == null && obj?.kind === 'hosted-theme' && obj?.repo === 'none') {
    const skipped = staleFindings({ proof: obj, headSha, changedFiles: [] });
    return skipped.error ? [skipped.error] : [];
  }
  if (obj?.commitSha && headSha && obj.commitSha === headSha) {
    return [];
  }
  if (!obj?.commitSha) {
    const findings = staleFindings({ proof: obj ?? {}, headSha, changedFiles: [] });
    return [findings.error ?? 'stale proof: commitSha is null'];
  }
  const diff = changedFilesBetween(obj.commitSha, headSha, cwd);
  if (diff.error) return [diff.error];
  const findings = staleFindings({
    proof: obj,
    headSha,
    changedFiles: diff.files,
    otherProofExists: localProofExists(headSha, cwd),
  });
  const message = formatStale({ proof: obj, headSha, findings });
  return message ? [message] : [];
}

function parseCli(argv) {
  const files = [];
  let head = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--head') {
      head = argv[i + 1] ?? '';
      i++;
      continue;
    }
    files.push(argv[i]);
  }
  return { files, head };
}

function main(argv) {
  const { files, head } = parseCli(argv);
  if (files.length === 0 || (argv.includes('--head') && !head)) {
    console.error('usage: node validate.mjs [--head <sha>] <proof.json>...');
    return 2;
  }
  let bad = 0;
  for (const f of files) {
    let obj;
    try {
      obj = JSON.parse(readFileSync(f, 'utf8'));
    } catch (e) {
      console.error(`FAIL ${f}\n  - cannot read or parse: ${e.message}`);
      bad++;
      continue;
    }
    const baseDir = dirname(resolve(f));
    const { ok, errors } = validateProof(obj, { baseDir, checkFiles: true });
    const stale = head ? staleErrors(obj, head, baseDir) : [];
    if (ok && stale.length === 0) console.log(`ok   ${f}`);
    else {
      bad++;
      console.error(`FAIL ${f}`);
      for (const e of errors) console.error(`  - ${e}`);
      for (const e of stale) console.error(`  - ${e}`);
    }
  }
  return bad ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
