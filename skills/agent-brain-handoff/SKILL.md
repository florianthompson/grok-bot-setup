---
name: agent-brain-handoff
description: Use when syncing bot state to the brain repo: on wake, after each done step, after a decision, and before context gets thin.
---
# Agent brain handoff

## Use when
Starting a session, ending one, after a durable decision, after each finished step, or when context is medium or high.

## Source of truth
The private `<brain-repo>`. Layout: see `BRAIN-LAYOUT.md`.
- `agents/<slug>/` standing roles (`ROLE.md`, `HANDOFF.md`, `ROUTINES.md`, `SKILLS.md`)
- `work/<slug>/` finite tasks (`README.md`, `SPEC.md`, `HANDOFF.md`), board in `work/STATUS.md`
- `archive/chats/` cold history with an `INDEX.md`

## Memory tiers
1. Hot: the platform's own profile memory and standing rules.
2. Working: a one-screen `HANDOFF.md`.
3. Cold: `archive/chats/` read through the index, newest match only.

Do not run a second memory service next to this.

## On wake
1. `git pull` the brain.
2. Read this bot's `ROLE.md` and `HANDOFF.md`, then `work/STATUS.md`, then any claimed `work/<slug>/HANDOFF.md`.
3. For history: `archive/chats/INDEX.md`, newest matching tag, that file only.
4. Load only the needed `projects/<app>/CONTEXT.md`.
5. Proceed from files, not from chat memory.

## After each done step
1. Rewrite the top of `work/<slug>/HANDOFF.md`: status, last step, next, blockers, links, `Context: low|med|high`.
2. Update the agent's own `HANDOFF.md` and `work/STATUS.md` if the board changed.
3. Commit `handoff(<slug>): after <step>` and push.
4. If context is medium or high, or a stream closed, run `session-compact-clear`.

## Never
Secrets. Full transcripts in a HANDOFF. Diary appends (rewrite the top instead). Writing state to a retired repo.
