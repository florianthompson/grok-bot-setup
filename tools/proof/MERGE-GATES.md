# Proof gate and merge gates

A ticket is **done** when the proof gate passes. A PR is **mergeable** when every merge gate below is green.

## Definition of done
The gate checks the form of the evidence. The substance is a real end-user test: open the real flow in a browser, click through it, enter data, submit, reload, and confirm it stuck, at 1440 and 390 wide. Code tests are extra and never the proof. Fix what the test finds before reporting. Screenshots are for design or UI only, never of terminals, test output, or code. Work with nothing to look at uses `Proof kind: non-ui`, a `Result:` line, and a link, still verified by a real end-to-end run. Full text in [`CHARTER.md`](../../CHARTER.md).

## Proof gate
`node tools/proof/proof_gate.mjs <TICKET> <path/to/proof.json> [--max-age-days 7]`

It exits 0 only when all of these hold:
1. **Schema.** `proof.json` validates (`validate.mjs`). Ticket id matches the folder `proof/<TICKET>/`. Screenshot files exist.
2. **Kind rules.**
   - `ui`: desktop (1440 wide) and mobile (390 wide) screenshots, plus a preview or live URL.
   - `non-ui`: a non-empty `result` and at least one of PR url, preview, or live. Screenshots may be empty.
3. **Checks.** Every check in `checks[]` exited 0. Console errors are warnings, or failures when `strictConsole` is true in `proof.config.json`.
4. **PR state.** The proof names the PR. The PR exists and is open (merged is fine after the fact).
5. **Not stale.** The proof's `commitSha` equals the PR head, or the only changes since are files under `proof/<TICKET>/`. Any other file changed after the measurement makes the proof stale: regenerate it.
6. **Multi-ticket stale rule.** In a PR that carries several tickets, a change under `proof/<OTHER>/` does not make this ticket's proof stale, provided `<OTHER>` is a ticket id and that folder holds its own `proof.json`. Any other path outside `proof/<TICKET>/` still counts as stale.
7. **Age.** Proof older than `--max-age-days` (default 7) fails: regenerate it.
8. **PR body.** `pr_body.mjs` passes on the live PR description (see below).

## PR body rule
The body declares `Proof kind: ui` or `Proof kind: non-ui` (missing means ui).
- **ui:** a desktop image embed, a 390 px image embed (two different images), and a clickable http(s) preview link that is not one of the images. An image labeled output, test, terminal, or code does not count.
- **non-ui:** a `Result:` line with real check output (for example `node --test 75/75`), at least one http(s) link, and no image that shows output, a test run, a terminal, or code.

Edit the body with `gh api -X PATCH repos/<org>/<repo>/pulls/<n> -F body=@file`. CI reruns the check on every edit.

## Merge gates (all must be true)
| # | Gate | How to check |
|---|---|---|
| 1 | PR is open and ready (not draft) | `gh pr view <url> --json isDraft,state` |
| 2 | Proof gate PASS on the current head | run it fresh, do not trust a pasted result |
| 3 | CI green | `gh pr checks <url>` |
| 4 | Risk label present and matches the diff | see `RISK-POLICY.md` |
| 5 | Approval record names this PR and this head sha | newest block for this PR |
| 6 | Risk B only: owner OK linked in the record | link to the Orchestrator relay |
| 7 | Diff stays inside the ticket scope | `gh pr diff <url> --name-only` |

Merge with the head pinned so a late push cannot slip in:

    gh pr merge <url> --squash --match-head-commit <sha>

Never use auto-merge, and never merge by hand around a failing gate. If a gate fails, fix the cause and rerun it. If the head changed after approval, review again and write a new Approval record block.

## CI
`proof.yml.template` is a GitHub Actions workflow: it runs the validator tests, the PR body check, and validates changed `proof.json` files. Copy it to `.github/workflows/proof.yml` in each target repo along with `scripts/proof/` (`validate.mjs`, `stale.mjs`, `pr_body.mjs`, `proof.schema.json`, tests, fixtures).
