// Shared stale-proof check. proof_gate.mjs passes the GitHub compare
// file list. CI and `validate.mjs --head` pass paths from local `git diff`.
import { execFileSync } from 'node:child_process';

function nameOf(file) {
  if (typeof file === 'string') return file;
  return file?.filename ?? '';
}

/**
 * Files outside proof/<ticket>/ between the measured commit and the head.
 * Same commit passes. A null commitSha is skipped only for hosted-theme with repo "none".
 * Multi-ticket PRs: a change under proof/<OTHER>/ is ignored only when <OTHER> is a ticket id
 * and that folder holds its own proof.json at the head (another ticket's proof artifacts).
 * `otherProofExists(ticket)` answers that; without it, only a proof/<OTHER>/proof.json in the
 * changed files counts. Any other path outside proof/<ticket>/ still makes the proof stale.
 * @returns {{ ok: boolean, skipped: boolean, outside: string[], otherProofs: string[], error: string|null }}
 */
export function staleFindings({ proof, headSha, changedFiles, otherProofExists }) {
  if (!proof || typeof proof !== 'object') {
    return { ok: false, skipped: false, outside: [], otherProofs: [], error: 'stale proof: proof is missing' };
  }
  if (proof.commitSha == null) {
    if (proof.kind === 'hosted-theme' && proof.repo === 'none') {
      return { ok: true, skipped: true, outside: [], otherProofs: [], error: null };
    }
    return { ok: false, skipped: false, outside: [], otherProofs: [], error: 'stale proof: commitSha is null' };
  }
  if (headSha && proof.commitSha === headSha) {
    return { ok: true, skipped: false, outside: [], otherProofs: [], error: null };
  }
  const prefix = `proof/${proof.ticket}/`;
  const names = (changedFiles ?? []).map(nameOf).filter(Boolean);
  const exists = otherProofExists ?? ((t) => names.includes(`proof/${t}/proof.json`));
  const known = new Map();
  const otherProof = (name) => {
    const m = name.match(OTHER_PROOF);
    if (!m || m[1] === proof.ticket) return null;
    if (!known.has(m[1])) known.set(m[1], Boolean(exists(m[1])));
    return known.get(m[1]) ? m[1] : null;
  };
  const outside = names.filter((name) => !name.startsWith(prefix) && !otherProof(name));
  const otherProofs = [...known].filter(([, ok]) => ok).map(([t]) => t);
  return { ok: outside.length === 0, skipped: false, outside, otherProofs, error: null };
}

const OTHER_PROOF = /^proof\/([A-Z][A-Z0-9]*-\d+)\/[^/].*$/;

/** True when proof/<ticket>/proof.json exists at `ref` in the local repo. */
export function localProofExists(ref, cwd) {
  return (ticket) => {
    try {
      execFileSync('git', ['cat-file', '-e', `${ref}:proof/${ticket}/proof.json`], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
      return true;
    } catch {
      return false;
    }
  };
}

export function formatStale({ proof, headSha, findings }) {
  if (!findings || findings.ok || findings.skipped) return null;
  if (findings.error) return findings.error;
  const prefix = `proof/${proof.ticket}/`;
  const shown = findings.outside.slice(0, 5).join(', ');
  const measured = String(proof.commitSha).slice(0, 7);
  const head = String(headSha ?? '').slice(0, 7);
  return `stale proof: measured ${measured} but head is ${head}, and ${findings.outside.length} changed file(s) are outside ${prefix}: ${shown}`;
}

function commitExists(sha, cwd) {
  try {
    execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

/** Local `git diff --name-only <commitSha> <headSha>`. Fails clearly when a sha is not in history. */
export function changedFilesBetween(commitSha, headSha, cwd) {
  if (!commitExists(commitSha, cwd)) {
    return { error: `stale proof: commit ${String(commitSha).slice(0, 7)} is not in local history` };
  }
  if (!commitExists(headSha, cwd)) {
    return { error: `stale proof: head ${String(headSha).slice(0, 7)} is not in local history` };
  }
  const out = execFileSync('git', ['diff', '--name-only', commitSha, headSha], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { files: out.split('\n').map((s) => s.trim()).filter(Boolean) };
}
