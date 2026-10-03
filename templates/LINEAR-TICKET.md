# Ticket template (Linear issue / PRD)

Paste everything below the line into the issue description, or into Linear's template editor (Settings, Templates). Delete the guidance lines once a section is filled. Section order is fixed because tools read the `Risk:` line and the `Approval record` block.

---

## Problem
> One or two sentences. What is wrong or missing, and for whom. If you cannot say it in two sentences, the ticket is not ready.

## Scope
- <what will be done>

**Non-scope:**
- <what will NOT be touched, so a reviewer can reject a wider diff>

**Repo and paths:** <org/repo>, <folders expected in the diff>

**Open questions:**
- <anything that blocks Ready; empty means none>

## Risk
> Set by change type, see RISK-POLICY.md. A: copy, UI, docs, previews, tests, internal tooling. B: prod, money, customer-visible.

Risk: A | B
Reason: <one line>
Source: change type (paths) | label risk:B | bumped by <who>

## Acceptance checklist
> Each item must be checkable by someone who did not write the code. The reviewer maps every box to evidence.

- [ ] <observable outcome 1>
- [ ] <observable outcome 2>
- [ ] Proof gate PASS (`node tools/proof/proof_gate.mjs <TICKET> <proof.json>`)
- [ ] PR body has the evidence for its proof kind

## Proof
> Every line needs a value or "n/a (why)". ui: desktop and 390 px image embeds plus a preview link. non-ui: `Proof kind: non-ui`, a `Result:` line, and a link. Never screenshot test output, a terminal, or code.

- Proof kind: ui | non-ui
- Preview URL: <clickable link>
- PR and state: <url> (draft | ready | merged)
- proof.json path: proof/<TICKET>/proof.json
- Gate result: <PASS line, commit measured>
- CI runs: <links>

## Approval record
> Written by PM. Risk A: after gate PASS and CI green. Risk B: only after the owner's OK was relayed by the Orchestrator. The record names the PR head sha; any later commit voids it. On a send back or a re-review add a NEW block and keep the old ones.

Approval record
- Decision: approved | sent back
- Approver: PM
- When: <date time timezone>
- Approved: PR <url> at head <sha>, proof gate PASS (<proof.json path>)
- Owner OK: <link to the relay> | n/a (A)
- Merge: <merge commit sha> | pending

## Session comments
> Short progress comments from whoever works the ticket, newest last. One comment per meaningful step. No chatter.

Comment shape:

    <date> <role>: <what changed>. Branch/PR: <link>. Next: <one line>. Blocked: <none | reason>.

Also keep the working conventions: branch named after the issue (`abc-123-short-name`), a draft PR opened early, pushes often, final `RESULT.md` in the task folder linked from the last comment.
