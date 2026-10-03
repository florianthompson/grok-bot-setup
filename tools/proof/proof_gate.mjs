#!/usr/bin/env node
// THE DONE GATE. A ticket is not done until this exits 0.
// Usage: node proof_gate.mjs <TICKET> <path/to/proof.json> [--max-age-days 7] [--linear-plan out.json] [--push-linear]
//
// UNTESTED PART: the --push-linear GraphQL path (pushToLinear below) was written from the Linear API
// docs without a LINEAR_API_KEY on this box, so it has never run against the real API. The gate
// itself (checks, PR state, stale rule, plan file) is tested. The PR body rule
// (desktop shot, 390px shot, preview link) is tested in pr_body.test.mjs.
// If the key is missing the push is skipped and the plan is pushed through the Linear MCP, see linear_push.md.
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateProof } from './validate.mjs';
import { checkPrBody } from './pr_body.mjs';
import { formatStale, staleFindings } from './stale.mjs';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const valueFlags = new Set(['--max-age-days', '--linear-plan']);
const positional = argv.filter((a, i) => !a.startsWith('--') && !valueFlags.has(argv[i - 1]));
const [ticket, proofPath] = positional;
if (!ticket || !proofPath) {
  console.error('usage: node proof_gate.mjs <TICKET> <path/to/proof.json> [--max-age-days 7] [--linear-plan out.json] [--push-linear]');
  process.exit(2);
}
const maxAgeDays = Number(opt('--max-age-days', '7'));

const failures = [];
const warnings = [];
const passes = [];
const fail = (m) => failures.push(m);
const gh = (args) => JSON.parse(execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));

function report(proof) {
  console.log(`PROOF GATE ${ticket}: ${failures.length ? 'FAIL' : 'PASS'}`);
  console.log(`  file: ${proofPath}`);
  for (const p of passes) console.log(`  ok    ${p}`);
  for (const w of warnings) console.log(`  warn  ${w}`);
  for (const f of failures) console.log(`  FAIL  ${f}`);
  if (proof && !failures.length) console.log(`  pr: ${proof.pr?.url ?? 'none'}  urls: ${[proof.urls.preview, proof.urls.live].filter(Boolean).join(' ')}`);
}

let proof;
try {
  proof = JSON.parse(readFileSync(proofPath, 'utf8'));
} catch (e) {
  fail(`cannot read ${proofPath}: ${e.message}`);
  report();
  process.exit(1);
}
const baseDir = dirname(resolve(proofPath));

// 1. schema + file rules
const v = validateProof(proof, { baseDir, checkFiles: true });
if (v.ok) {
  passes.push(proof.proofKind === 'non-ui'
    ? 'schema, non-ui result, files, checks exit 0'
    : 'schema, screenshots (desktop + 390, real PNG sizes), files, checks exit 0');
} else v.errors.forEach((e) => fail(`validate: ${e}`));

// 2. ticket matches argument
if (proof.ticket === ticket) passes.push(`ticket matches ${ticket}`);
else fail(`ticket mismatch: proof says ${proof.ticket}, gate was called for ${ticket}`);

// 3. checks (also reported by the validator, listed here so the report names each one)
for (const c of proof.checks ?? []) if (c.exitCode === 0) passes.push(`check "${c.name}" exit 0`);

// 4. console errors: warnings unless proof.config.json (nearest one above the proof dir) says strictConsole
let strict = false;
for (let d = baseDir, i = 0; i < 5; d = dirname(d), i++) {
  const cfg = join(d, 'proof.config.json');
  if (existsSync(cfg)) {
    try { strict = JSON.parse(readFileSync(cfg, 'utf8')).strictConsole === true; } catch {}
    break;
  }
}
const cerrs = proof.console?.errors ?? [];
if (cerrs.length === 0) passes.push('no console errors');
for (const e of cerrs) (strict ? fail : (m) => warnings.push(m))(`console error on ${e.route} (${e.viewport}): ${e.text}`);

// 5. age
const age = (Date.now() - Date.parse(proof.createdAt)) / 86400000;
if (Number.isNaN(age)) fail('createdAt is not a date');
else if (age > maxAgeDays) fail(`proof is ${age.toFixed(1)} days old, max ${maxAgeDays}. Regenerate it`);
else passes.push(`proof age ${age.toFixed(1)} days (max ${maxAgeDays})`);

// 6. PR is real and the proof is not stale
if (proof.pr) {
  try {
    const live = gh(['pr', 'view', proof.pr.url, '--json', 'state,headRefOid,isDraft,mergedAt,body']);
    if (live.state === 'CLOSED') fail(`PR is CLOSED without merge: ${proof.pr.url}`);
    else passes.push(`PR exists, live state ${live.state}`);
    if (live.isDraft) warnings.push('PR is still a draft');
    const bodyResult = checkPrBody(live.body ?? '', { proofKind: proof.proofKind });
    if (bodyResult.ok) {
      passes.push(bodyResult.kind === 'non-ui'
        ? 'PR body is non-ui: a Result line and a link, no output, test, terminal or code shots'
        : 'PR body is ui: desktop and 390px image embeds and a preview link');
    } else bodyResult.errors.forEach((e) => fail(`PR body: ${e}`));
    if (proof.commitSha && live.headRefOid && proof.commitSha !== live.headRefOid) {
      const m = proof.pr.url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\//);
      if (!m) fail('stale proof: cannot parse PR url for the compare call');
      else {
        try {
          const cmp = gh(['api', `repos/${m[1]}/${m[2]}/compare/${proof.commitSha}...${live.headRefOid}`]);
          const otherProofExists = (t) => {
            try {
              gh(['api', `repos/${m[1]}/${m[2]}/contents/proof/${t}/proof.json?ref=${live.headRefOid}`]);
              return true;
            } catch {
              return false;
            }
          };
          const findings = staleFindings({ proof, headSha: live.headRefOid, changedFiles: cmp.files ?? [], otherProofExists });
          const message = formatStale({ proof, headSha: live.headRefOid, findings });
          if (message) fail(message);
          else passes.push(`proof commit is behind head ${live.headRefOid.slice(0, 7)} only by files under proof/${proof.ticket}/${findings.otherProofs?.length ? ` and other tickets' proof folders (${findings.otherProofs.join(', ')})` : ''}`);
        } catch (e) {
          fail(`stale proof: commit ${proof.commitSha.slice(0, 7)} differs from PR head ${live.headRefOid.slice(0, 7)} and compare failed: ${String(e.stderr || e.message).split('\n')[0]}`);
        }
      }
    } else if (proof.commitSha) passes.push('commitSha equals PR head');
  } catch (e) {
    fail(`cannot read PR ${proof.pr.url} via gh: ${String(e.stderr || e.message).split('\n')[0]}`);
  }
} else if (proof.kind === 'hosted-theme') warnings.push('no PR (hosted-theme without repo)');

report(proof);
if (failures.length) process.exit(1);

// ---------- Linear plan ----------
const CONTENT_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
function buildPlan() {
  const links = [];
  if (proof.pr) links.push({ url: proof.pr.url, title: `PR #${proof.pr.number} (${proof.repo})` });
  if (proof.urls.preview) links.push({ url: proof.urls.preview, title: 'Preview' });
  if (proof.urls.live) links.push({ url: proof.urls.live, title: 'Live' });
  const files = proof.screenshots.map((s) => {
    const absPath = resolve(baseDir, s.path);
    const ext = absPath.slice(absPath.lastIndexOf('.')).toLowerCase();
    return {
      absPath,
      filename: `${proof.ticket}-${basename(s.path)}`,
      contentType: CONTENT_TYPES[ext] ?? 'application/octet-stream',
      size: statSync(absPath).size,
      title: `${s.viewport === 'mobile390' ? 'Mobile 390px' : 'Desktop'} ${s.route} (${s.width}x${s.height} @${s.deviceScaleFactor}x)`,
    };
  });
  const rows = proof.checks.map((c) => `| ${c.name} | \`${c.command}\` | ${c.exitCode} | ${(c.durationMs / 1000).toFixed(1)}s |`);
  const comment = [
    `**Proof gate: PASS** for ${proof.ticket}`,
    '',
    `- Commit: \`${proof.commitSha ?? 'n/a'}\` on \`${proof.branch}\``,
    ...links.map((l) => `- ${l.title}: ${l.url}`),
    `- Measured: ${proof.createdAt} by ${proof.createdBy}`,
    `- Console errors: ${proof.console.errors.length}${warnings.length ? ` (${warnings.length} warning(s))` : ''}`,
    '',
    ...(rows.length ? ['| Check | Command | Exit | Time |', '|---|---|---|---|', ...rows, ''] : []),
    proof.proofKind === 'non-ui'
      ? `Result: ${proof.result ?? ''}`
      : 'Screenshots (desktop and 390px) are attached below.',
  ].join('\n');
  return { issue: proof.ticket, links, files, comment };
}

const plan = buildPlan();
const planOut = opt('--linear-plan');
if (planOut) {
  writeFileSync(planOut, JSON.stringify(plan, null, 2) + '\n');
  console.log(`linear plan written: ${planOut}`);
}

// ---------- Linear push (UNTESTED, see header) ----------
async function pushToLinear(plan, key) {
  const gql = async (query, variables) => {
    const res = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: key },
      body: JSON.stringify({ query, variables }),
    });
    const body = await res.json();
    if (!res.ok || body.errors) throw new Error(`Linear GraphQL error: ${JSON.stringify(body.errors ?? res.status)}`);
    return body.data;
  };
  const { issue } = await gql('query($id:String!){ issue(id:$id){ id identifier } }', { id: plan.issue });
  const issueId = issue.id;

  for (const l of plan.links) {
    await gql('mutation($input:AttachmentCreateInput!){ attachmentCreate(input:$input){ success } }',
      { input: { issueId, url: l.url, title: l.title } });
    console.log(`linked ${l.url}`);
  }

  const images = [];
  for (const f of plan.files) {
    const up = (await gql(
      `mutation($contentType:String!,$filename:String!,$size:Int!){
         fileUpload(contentType:$contentType, filename:$filename, size:$size){
           success uploadFile{ uploadUrl assetUrl headers{ key value } } } }`,
      { contentType: f.contentType, filename: f.filename, size: f.size })).fileUpload.uploadFile;
    const headers = { 'Content-Type': f.contentType, 'Cache-Control': 'public, max-age=31536000' };
    for (const h of up.headers) headers[h.key] = h.value; // verbatim
    const put = await fetch(up.uploadUrl, { method: 'PUT', headers, body: readFileSync(f.absPath) });
    if (!put.ok) throw new Error(`upload of ${f.filename} failed: HTTP ${put.status}`);
    images.push(`![${f.title}](${up.assetUrl})`);
    console.log(`uploaded ${f.filename}`);
  }

  const body = `${plan.comment}\n\n${images.join('\n\n')}`;
  await gql('mutation($input:CommentCreateInput!){ commentCreate(input:$input){ success } }', { input: { issueId, body } });
  console.log(`comment posted on ${plan.issue}`);
}

if (flag('--push-linear')) {
  const key = process.env.LINEAR_API_KEY;
  if (!key) console.log('no LINEAR_API_KEY: push via Linear MCP using the plan (see linear_push.md)');
  else {
    try {
      await pushToLinear(plan, key);
    } catch (e) {
      console.error(`Linear push failed (gate itself passed): ${e.message}`);
      process.exit(3);
    }
  }
}
