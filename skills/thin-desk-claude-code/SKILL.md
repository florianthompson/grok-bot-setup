---
name: thin-desk-claude-code
description: Use when deciding who does the work. Grok stays a thin desk, Claude Code on the shared computer is the doer for all building.
---
# Thin desk, Claude Code doer

All building runs in Claude Code on the shared computer, billed to a Claude plan. Grok claims, specs, gates, and reports. No cloud coding agents by default.

Pick one default model, set it in `~/.claude/settings.json` (`"model": "<model>"`), and also pass `--model <model>` on every launch so no session drifts.

## Split
| Desk (Grok) | Doer (Claude Code) |
|---|---|
| Hear the ask, check the ticket, write a short prompt | Implementation, tests, proof shots, scripts |
| Gates: merge, send, activate, money | Browser preview loop, verification, dry runs |
| Review the result and report | Data queries, builds, renders |

## Hand off
1. Fresh folder `tasks/<ticket-slug>`. Check out the ticket branch there. Trust the folder for Claude once.
2. Write `PROMPT.md`:
   - goal, ticket link, branch and draft PR;
   - hard limits: no merge, no production deploy, no migration without a backup, no sending, no spend;
   - the browser preview loop: open the change at 1440 and 390 wide, compare with the reference, iterate until it matches;
   - the proof rule (ui: desktop and 390 shots plus a preview link; non-ui: a result line plus links);
   - done-when, frequent commits and pushes, work directly in this checkout, and a final `RESULT.md`.
3. Launch in the background: `claude --bg --model <model> --permission-mode auto "<prompt>"`.
4. Check: `claude agents`, `claude logs <session>`. Sessions do not notify the desk, so use a short-lived watch (a routine that looks for `RESULT.md`).
5. When it stops, read `RESULT.md`, check the PR head and the proof, open the screenshots yourself, comment on the ticket, report to PM.
6. Steer a running session with a message instead of starting a second one. Stop with `claude stop <full session id>`.

## Never
- Run a Claude session on a model other than the default.
- Implement in the Grok thread, or redo the doer's loops "just to check".
- Accept a UI done without the doer's own comparison at 1440 and 390.
- Send or activate anything for real recipients without the owner's approval of that exact batch.
- Match processes by pattern to stop them (`pkill -f`, `killall`).

## Done
The doer previewed, iterated, pushed code and proof. The desk only gated and relayed.
