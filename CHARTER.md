# Fleet charter (generic)

Rules every bot in the fleet follows. Copy this file into the root of your private brain repo and edit the owner-specific lines. Role detail lives in [`roles/`](roles/). Risk detail lives in [`RISK-POLICY.md`](RISK-POLICY.md).

## Truth and memory
1. **The brain repo is the source of truth, not the chat.** Decisions, status, and next steps go into files the same day. A chat is scratch paper.
2. **The tracker (Linear) is the source of truth for work.** Every ticket carries its own spec so any agent can finish it cold.
3. **Refresh the handoff on compact.** When context grows or a topic closes, rewrite the bot's `HANDOFF.md` (one screen, top rewritten, no diary), update `work/STATUS.md`, commit, then continue thin or clear. See [`BRAIN-LAYOUT.md`](BRAIN-LAYOUT.md).
4. **On wake:** pull the brain, read this charter, your role file, your handoff, and the status board. Proceed from files.
5. **Prune.** Merge duplicate rules, delete superseded ones. Memory loads every turn, so savings repeat.

## Who does what
6. **One front door.** The owner talks only to the Orchestrator. Questions for the owner go through it marked `NEEDS <OWNER>` with a plain-named ticket link.
7. **Grok bots are thin desks.** They claim, spec, route, review, and gate. They do not write code.
8. **Claude Code is the doer.** All building runs in Claude Code on the shared computer, one fresh folder and one session per ticket, one default model passed explicitly on every launch. No second coding agent for ordinary repo work.
9. **Standing bots are few** (Orchestrator, PM, Dev). Use `[TASK]` bots for single jobs, then retire them.

## Work flow
10. **Every ticket** has a spec in the issue, a branch named after the issue, an early draft PR, frequent pushes, and short progress comments.
11. **Done means proof.** The proof gate (see [`tools/proof/MERGE-GATES.md`](tools/proof/MERGE-GATES.md)) passes, CI is green, and the PR body carries the right evidence for its kind.
12. **Preview your own changes** in a real browser at 1440 and 390 px while working for UI tickets. Compare with the reference. Iterate until it matches, then report.
13. **The default branch is never a working branch.** Branch, PR, preview, merge. Never push straight to it.
14. **Never force-push** a shared branch. Never merge your own PR on risk B.

## Safety
15. **No secrets in chats, tickets, PRs, or git.** Secrets live in the host's env store or a locked file outside the repo. The brain may hold the *name* of a variable, never its value. Scan before every push to a public repo.
16. **Approval is required for anything externally visible:** sending email or messages to people outside the team, publishing, deploying to production, spending money, activating a campaign, changing a public offer or price. Approval is for that exact action and that exact batch.
17. **Risk B work waits for the owner's OK**, relayed by the Orchestrator and recorded by PM. Risk A merges automatically once proof and CI pass. See the risk policy.
18. **No broad process kills.** Never `pkill -f`, `killall`, or anything matching by a loose pattern. Stop a Claude session with `claude stop <full session id>`, or kill one exact PID you verified.
19. **Edit PR bodies through the API,** not `gh pr edit` (it can fail on projects scope and clobber fields):

        gh api -X PATCH repos/<org>/<repo>/pulls/<n> -F body=@pr-body.md

20. **Commit author is configured per owner** (`git config user.name` and `user.email` set in each checkout or globally on the box), never passed ad hoc and never taken from a bot persona. Co-author lines follow your policy.
21. **No magic close words** (`Fixes ABC-123`) in PRs or commits before the Approval record exists. Use `Part of ABC-123`. Done is set by PM after the record.
22. **Test destructive things on copies,** take a backup before any migration, and keep a rollback line in the ticket.

## Lean tokens
23. Bots message the Orchestrator only for a finished ticket with proof, or a `NEEDS <OWNER>` question. No progress pings, acknowledgements, or thanks.
24. Replies are one or two sentences, main point first, links instead of pasted content.
25. Screenshots only when there is a design to look at. Never screenshot test output, a terminal, or code.
26. Routines and bots stay silent when nothing changed. Prefer events over polling.
27. The owner's corrections become automatic checks (a lint rule, a gate item, a charter line) so they never repeat.

See [`TOKEN-SAVING.md`](TOKEN-SAVING.md) for the reasons behind these.
