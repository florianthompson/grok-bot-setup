import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { validateProof } from './validate.mjs';

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.alloc(1 + width * 3);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const root = mkdtempSync(join(tmpdir(), 'proof-test-'));
const dir = join(root, 'proof', 'ABC-123');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'desktop.png'), png(1440, 20));
writeFileSync(join(dir, 'mobile.png'), png(780, 20));

const valid = () => ({
  schemaVersion: 1,
  ticket: 'ABC-123',
  repo: 'your-org/web-app',
  kind: 'web-app',
  branch: 'abc-123-proof-json',
  commitSha: 'a'.repeat(40),
  pr: { url: 'https://github.com/your-org/web-app/pull/6', number: 6, state: 'OPEN', isDraft: true, merged: false, mergedAt: null },
  urls: { preview: 'https://preview.example.com', live: null },
  screenshots: [
    { path: 'desktop.png', viewport: 'desktop', width: 1440, height: 20, deviceScaleFactor: 1, route: '/' },
    { path: 'mobile.png', viewport: 'mobile390', width: 780, height: 20, deviceScaleFactor: 2, route: '/' },
  ],
  checks: [{ name: 'unit', command: 'node --test', exitCode: 0, durationMs: 120, summary: 'pass 3' }],
  console: { errors: [] },
  createdAt: '2026-10-03T10:00:00+00:00',
  createdBy: 'test',
});

const run = (mutate) => {
  const p = valid();
  mutate?.(p);
  return validateProof(p, { baseDir: dir, checkFiles: true });
};
const rejects = (name, mutate, needle) =>
  test(`rejects: ${name}`, () => {
    const r = run(mutate);
    assert.equal(r.ok, false, 'expected failure');
    assert.ok(r.errors.some((e) => e.includes(needle)), `no error containing "${needle}" in:\n${r.errors.join('\n')}`);
  });

test('valid fixture passes', () => {
  const r = run();
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
});

rejects('bad ticket', (p) => { p.ticket = 'ABC-xyz'; }, 'ticket');
rejects('ticket differs from directory', (p) => { p.ticket = 'ABC-124'; }, 'does not match directory proof/ABC-123/');
rejects('missing mobile390 shot', (p) => { p.screenshots = p.screenshots.filter((s) => s.viewport !== 'mobile390'); }, 'mobile390 screenshot is required');
rejects('missing desktop shot', (p) => { p.screenshots = p.screenshots.filter((s) => s.viewport !== 'desktop'); }, 'desktop screenshot is required');
rejects('wrong 390 width', (p) => { p.screenshots[1].width = 390; }, 'mobile390 width must be 390 x deviceScaleFactor');
rejects('desktop too narrow', (p) => { p.screenshots[0].width = 1000; }, 'desktop width must be >= 1280');
rejects('failed check exitCode', (p) => { p.checks[0].exitCode = 1; }, 'failed, exitCode 1');
rejects('missing file', (p) => { p.screenshots[0].path = 'nope.png'; }, 'does not exist');
rejects('path escaping the proof dir', (p) => { p.screenshots[0].path = '../../x.png'; }, 'must be relative');
rejects('PNG size differs from declared', (p) => { p.screenshots[0].height = 99; }, 'declared 1440x99 but PNG is 1440x20');
rejects('no urls', (p) => { p.urls = { preview: null, live: null }; }, 'at least one of preview or live');
rejects('bad sha', (p) => { p.commitSha = 'abc123'; }, 'commitSha');
rejects('null pr on non-theme kind', (p) => { p.pr = null; }, 'pr: may only be null');
rejects('createdAt without offset', (p) => { p.createdAt = '2026-10-03T10:00:00'; }, 'createdAt');
rejects('unknown field', (p) => { p.extra = 1; }, 'extra: unknown field');

test('hosted-theme may omit pr and sha when repo is none', () => {
  const r = run((p) => { p.kind = 'hosted-theme'; p.repo = 'none'; p.pr = null; p.commitSha = null; });
  assert.deepEqual(r.errors, []);
});

test('proof.json without proofKind still requires desktop and 390 shots', () => {
  const r = run();
  assert.equal(r.ok, true);
  assert.equal(Object.hasOwn(valid(), 'proofKind'), false);
});

test('proofKind non-ui validates with zero screenshots and a result', () => {
  const r = run((p) => {
    p.proofKind = 'non-ui';
    p.result = 'node --test 8/8';
    p.screenshots = [];
    p.urls = { preview: null, live: null };
  });
  assert.deepEqual(r.errors, []);
});

rejects('unknown proofKind', (p) => { p.proofKind = 'both'; }, 'proofKind');
rejects('non-ui without result', (p) => { p.proofKind = 'non-ui'; p.screenshots = []; }, 'non-empty result');
rejects('non-ui without a link', (p) => {
  p.proofKind = 'non-ui';
  p.result = 'node --test 1/1';
  p.screenshots = [];
  p.pr = null;
  p.urls = { preview: null, live: null };
  p.kind = 'hosted-theme';
}, 'pr.url, urls.preview or urls.live');
rejects('non-ui check must still exit 0', (p) => {
  p.proofKind = 'non-ui';
  p.result = 'node --test 1/1';
  p.screenshots = [];
  p.checks[0].exitCode = 1;
}, 'exitCode 1');

test.after(() => rmSync(root, { recursive: true, force: true }));
