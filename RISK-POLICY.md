# Risk policy

Risk is set by **change type**, not by project. It decides who approves a merge and how much proof is needed.

## Risk A: low blast radius
Copy, CSS and UI, docs, previews, mocks, tests, internal tooling, skills, and brain files.

- **Approver:** PM. No human needed.
- **Required before merge:**
  1. Proof gate PASS (`node tools/proof/proof_gate.mjs <TICKET> <proof.json>`).
  2. CI green on the PR head.
  3. PR carries label `risk:A`.
  4. An Approval record naming the PR head sha, with `Owner OK: n/a (A)`.
- **Then:** squash-merge, send the Orchestrator one line, set the ticket Done.

## Risk B: prod, money, customer-visible
Anything where a mistake reaches users or costs money or trust:

- database migrations and schema
- payments, checkout, billing, pricing
- authentication, middleware, secrets, permissions
- live production sites, live themes, DNS, deploys to production
- email or messages sent to customers or prospects
- any API route or job that real users depend on

- **Approver:** the owner. The Orchestrator relays the OK; PM records it. Nobody else may approve, and the author of the PR never merges it.
- **Required before merge:** everything in risk A, plus:
  1. A `NEEDS <OWNER>` message that states the risk reason, what changed in two lines, the PR and head sha, and the evidence.
  2. The owner's OK relayed by the Orchestrator, linked in the Approval record under `Owner OK`.
  3. For database changes: a backup or snapshot reference and a rollback line.
  4. For send actions: the exact recipients and text approved, and a test send to yourself first.
  5. PR carries label `risk:B`.
- **Voiding:** the approval names a head sha. Any later commit voids it. Re-review and ask again.

## Resolving the level
1. Look at the paths in the diff. If any path matches a B rule, the ticket is B.
2. A `risk:B` label always gives B. A `risk:A` label never overrides a B path.
3. No label on the PR is a finding: add one before merge.
4. If the diff touches something B that no rule caught, bump it to B and say so in the ticket.
5. When unsure, B. Only the owner lowers a level.

## Example path rules (edit for your stack)
| Level | Globs |
|---|---|
| B | `**/migrations/**`, `**/*.sql`, `**/auth/**`, `**/middleware.*`, `.env*`, `**/checkout/**`, `**/payments/**`, `**/*webhook*`, `**/emails/**`, `**/api/**` |
| A | `**/*.md`, `docs/**`, `**/*.css`, `**/*.test.*`, `tests/**`, `proof/**`, `tools/**`, `skills/**`, `components/**` |
| default | B |

Keep the rules in a small JSON file in your brain repo if you want a script to resolve them. The level and reason go in the ticket's Risk section.
