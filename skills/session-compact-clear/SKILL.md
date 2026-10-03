---
name: session-compact-clear
description: Use when the Orchestrator sees a new stream on the same work, a new task in a thick thread, medium or high context, or the owner says compact or archive.
---
# Session compact and clear

## Use when
A new stream appears on the same work, a new task shows up in a standing thread, context is medium or high, or the owner says "compact", "checkpoint", or "archive". The Orchestrator triggers this itself and does not wait to be asked.

| Situation | Action |
|---|---|
| Same work, new step | **Compact:** rewrite the work and agent handoffs, write or update the chat archive and index, commit, set Context and Last compact. Stay in the thread only if context is low. |
| New task in this chat | **Compact + clear:** archive and handoff to the brain, then open a new chat named `[TASK] <task name>` pointed at `work/<slug>/`. Do not run the new task in the thick thread. |
| Owner says "compact" | Compact now. Clear if context is medium or high, or the owner is switching tasks. |

## Chat archive (required on compact)
1. Write `archive/chats/<agent>/YYYY-MM-DD-<slug>.md`. Header: `date`, `agent`, `tags` (3 to 8 kebab words), `summary` (one line), `handoff` (path). Body: decisions, open loops, links. Optional short excerpt. No secrets.
2. Prepend a row to `archive/chats/INDEX.md`, newest first.
3. Rewrite the short agent and work `HANDOFF.md` files.
4. Commit those paths (`handoff(<slug>): archive + compact`).
5. Then continue thin or clear.

## Read-back
Open the index, filter by topic, read only the newest matching archive and its handoff. Reload older ones only if the newest is not enough.

## Steps
1. Pause at the boundary.
2. Write the archive and the one-screen handoffs.
3. Commit and push to the brain.
4. Tell the owner in one line what you did and whether to stay or start thin.
5. If clearing, open the named `[TASK]` chat and point it at the work slug.

## Context gauge
low: continue after compact. medium or high: clear before more heavy work.
