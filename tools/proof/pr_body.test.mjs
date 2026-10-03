import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkPrBody } from './pr_body.mjs';

const dir = new URL('./fixtures/pr-body/', import.meta.url);
const script = new URL('./pr_body.mjs', import.meta.url).pathname;
const read = (name) => readFileSync(new URL(name, dir), 'utf8');

const needles = {
  'fail-no-desktop.md': ['desktop screenshot'],
  'fail-no-390.md': ['390px screenshot'],
  'fail-no-preview.md': ['preview URL'],
  'fail-empty.md': ['desktop screenshot', '390px screenshot', 'preview URL'],
  'fail-placeholders.md': ['desktop screenshot', '390px screenshot', 'preview URL'],
  'fail-one-image-both.md': ['same screenshot'],
  'fail-output-no-link.md': ['desktop screenshot', '390px screenshot', 'preview URL', 'does not count as a UI shot'],
  'fail-output-shot.md': ['desktop screenshot', '390px screenshot', 'does not count as a UI shot'],
  'fail-query-only.md': ['desktop screenshot', '390px screenshot'],
  'fail-code-fence.md': ['desktop screenshot', '390px screenshot', 'preview URL'],
  'fail-comment.md': ['desktop screenshot', '390px screenshot', 'preview URL'],
  'fail-label-steals-preview.md': ['desktop screenshot'],
  'fail-link-only.md': ['desktop screenshot', '390px screenshot'],
  'fail-link-only-output.md': ['desktop screenshot', '390px screenshot'],
  'fail-test-output-shots.md': ['desktop screenshot', '390px screenshot', 'does not count as a UI shot'],
  'fail-non-ui-no-result.md': ['Result:'],
  'fail-non-ui-no-link.md': ['http or https link'],
  'fail-non-ui-output-image.md': ['labelled output, test, terminal or code'],
  'fail-non-ui-terminal-filename.md': ['labelled output, test, terminal or code'],
};

const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort();

for (const file of files) {
  test(file, () => {
    const result = checkPrBody(read(file));
    if (file.startsWith('pass-')) {
      assert.equal(result.ok, true, result.errors.join('\n'));
      assert.ok(result.preview, 'pass fixture found no preview link');
      return;
    }
    assert.equal(result.ok, false, 'expected the gate to fail');
    const need = needles[file];
    assert.ok(need, `add expected error text for ${file}`);
    for (const n of need) {
      assert.ok(result.errors.some((e) => e.includes(n)), `no error containing "${n}" in:\n${result.errors.join('\n')}`);
    }
  });
}

test('visual fixture keeps the preview url separate from the shots', () => {
  const result = checkPrBody(read('pass-visual.md'));
  assert.equal(result.ok, true);
  assert.equal(result.kind, 'ui');
  assert.equal(result.declaredKind, null);
  assert.equal(result.desktop, true);
  assert.equal(result.mobile390, true);
  assert.equal(result.preview, 'https://shop.example.com/preview');
});

test('a body with no Proof kind line is checked as ui', () => {
  const result = checkPrBody(read('pass-html-img.md'));
  assert.equal(result.kind, 'ui');
  assert.equal(result.ok, true);
});

test('an output shot does not satisfy desktop and 390', () => {
  const result = checkPrBody(read('fail-output-no-link.md'));
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'ui');
  assert.equal(result.desktop, false);
  assert.ok(result.errors.some((e) => e.includes('desktop screenshot')));
  assert.ok(result.errors.some((e) => e.includes('390px screenshot')));
});

test('link text that says desktop is not a shot', () => {
  const result = checkPrBody(read('fail-link-only.md'));
  assert.equal(result.desktop, false);
  assert.equal(result.mobile390, false);
  assert.equal(result.preview, 'https://preview.example.com/page');
});

test('query string markers do not count', () => {
  const result = checkPrBody(read('fail-query-only.md'));
  assert.equal(result.preview, 'https://preview.example.com/home');
  assert.equal(result.desktop, false);
});

test('non-ui body with a Result line and a link passes, including a diagram', () => {
  const plain = checkPrBody(read('pass-non-ui.md'));
  assert.equal(plain.ok, true);
  assert.equal(plain.kind, 'non-ui');
  assert.equal(plain.result, 'node --test 12/12');
  assert.equal(plain.link, 'https://github.com/your-org/brain-repo/pull/16');
  const diagram = checkPrBody(read('pass-non-ui-diagram.md'));
  assert.equal(diagram.ok, true, diagram.errors.join('\n'));
  assert.equal(diagram.kind, 'non-ui');
});

test('non-ui fails without a Result line, without a link, and with a test-output image', () => {
  assert.equal(checkPrBody(read('fail-non-ui-no-result.md')).ok, false);
  assert.equal(checkPrBody(read('fail-non-ui-no-link.md')).ok, false);
  const shot = checkPrBody(read('fail-non-ui-output-image.md'));
  assert.equal(shot.ok, false);
  assert.ok(shot.errors.some((e) => e.includes('labelled output, test, terminal or code')));
});

test('ui shots of test output do not count, and a code filename does not count', () => {
  const ui = checkPrBody(read('fail-test-output-shots.md'));
  assert.equal(ui.kind, 'ui');
  assert.equal(ui.ok, false);
  const code = checkPrBody([
    '![desktop](https://cdn.example.com/home-desktop.png)',
    '![review](https://cdn.example.com/shots/code.png)',
    'https://preview.example.com/home',
  ].join('\n'));
  assert.equal(code.ok, false);
  assert.ok(code.errors.some((e) => e.includes('390px screenshot')));
});

test('Proof kind inside a fence or comment does not change the kind', () => {
  const fenced = checkPrBody('```\nProof kind: non-ui\n```\n' + read('pass-visual.md'));
  assert.equal(fenced.kind, 'ui');
  assert.equal(fenced.ok, true);
  const comment = checkPrBody('<!-- Proof kind: non-ui -->\n' + read('pass-visual.md'));
  assert.equal(comment.kind, 'ui');
  assert.equal(comment.ok, true);
});

test('body kind that differs from proof.json fails', () => {
  const result = checkPrBody(read('pass-non-ui.md'), { proofKind: 'ui' });
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'ui');
  assert.ok(result.errors.some((e) => e.includes('body is non-ui') && e.includes('proof.json says ui')));
});

test('proof.json non-ui overrides a missing body line', () => {
  const body = 'Result: node --test 4/4\n\nhttps://github.com/org/repo/pull/3\n';
  assert.equal(checkPrBody(body).kind, 'ui');
  assert.equal(checkPrBody(body).ok, false);
  const over = checkPrBody(body, { proofKind: 'non-ui' });
  assert.equal(over.kind, 'non-ui');
  assert.equal(over.ok, true, over.errors.join('\n'));
});

test('unknown proof kind fails', () => {
  const result = checkPrBody('Proof kind: banana\n\nhttps://preview.example.com/home');
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('unknown proof kind')));
  const flag = checkPrBody(read('pass-visual.md'), { proofKind: 'both' });
  assert.equal(flag.ok, false);
  assert.ok(flag.errors.some((e) => e.includes('unknown proof kind')));
});

test('cli pass fixture exits 0 and names the kind', () => {
  const r = spawnSync(process.execPath, [script, '--body-file', new URL('pass-visual.md', dir).pathname], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /PR BODY PROOF: PASS/);
  assert.match(r.stdout, /kind: ui/);
  assert.match(r.stdout, /preview: https:\/\/shop\.example\.com\/preview/);
});

test('cli --proof-kind non-ui checks a body with no kind line', () => {
  const file = join(tmpdir(), `pr-body-kind-${process.pid}.md`);
  writeFileSync(file, 'Result: node --test 1/1\n\nhttps://github.com/org/repo/pull/1\n');
  const r = spawnSync(process.execPath, [script, '--body-file', file, '--proof-kind', 'non-ui'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /kind: non-ui/);
  assert.match(r.stdout, /result: node --test 1\/1/);
});

test('cli rejects an unknown --proof-kind', () => {
  const r = spawnSync(process.execPath, [script, '--body-file', new URL('pass-visual.md', dir).pathname, '--proof-kind', 'both'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--proof-kind/);
});

test('cli fail fixture exits 1', () => {
  const r = spawnSync(process.execPath, [script, '--body-file', new URL('fail-empty.md', dir).pathname], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /PR BODY PROOF: FAIL/);
  assert.match(r.stdout, /kind: ui/);
  assert.match(r.stdout, /desktop screenshot/);
  assert.match(r.stdout, /390px screenshot/);
  assert.match(r.stdout, /preview URL/);
});

test('cli --github-event reads pull_request.body', () => {
  const event = join(tmpdir(), `pr-body-event-${process.pid}.json`);
  writeFileSync(event, JSON.stringify({ pull_request: { body: read('fail-no-preview.md') } }));
  const r = spawnSync(process.execPath, [script, '--github-event', event], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /preview URL/);
  assert.doesNotMatch(r.stdout, /desktop screenshot/);
});

test('CLI reads a slow stdin pipe (gh pr view ... | node pr_body.mjs)', () => {
  const file = new URL('pass-visual.md', dir).pathname;
  const r = spawnSync('sh', ['-c', `(sleep 0.3; cat "${file}") | "${process.execPath}" "${script}"`], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /PR BODY PROOF: PASS/);
});

// Repo copies in scripts/proof/ carry no proof_gate.mjs, so this test only runs in the brain repo.
const gateFile = new URL('./proof_gate.mjs', import.meta.url);
test('proof_gate checks the PR body', { skip: existsSync(gateFile) ? false : 'no proof_gate.mjs in this copy' }, () => {
  const src = readFileSync(gateFile, 'utf8');
  assert.match(src, /checkPrBody\(live\.body/);
  assert.match(src, /proofKind: proof\.proofKind/);
});
