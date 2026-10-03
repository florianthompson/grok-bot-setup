# Brain layout

The brain is a **private** GitHub repo (call it `<brain-repo>`). Bots pull it on wake and write to it on every meaningful step. The product code stays in its own repos. The brain only points at them.

```
<brain-repo>/
  README.md              index: what is here, how to add a learning (or INDEX.md)
  CHARTER.md             fleet rules (copy of this kit's CHARTER.md, edited)
  RISK-POLICY.md         risk A / B rules
  PICKUP.md              how a cold session resumes: the 5 files to read first
  MEMORY.md              one line per learning, loaded first
  agents/
    README.md            fleet table and the per-session routine
    <slug>/              one folder per standing bot
      ROLE.md            stable: owns / good looks like / never
      HANDOFF.md         live: status, focus, next, blockers (one screen)
      ROUTINES.md        saved routines, prompt as intent, trigger, window
      SKILLS.md          which skills this bot uses and where they live
  work/
    STATUS.md            one-line board, newest first
    <slug>/              finite task: README.md, SPEC.md, HANDOFF.md
    archive/<slug>/      finished tasks
  archive/
    chats/
      INDEX.md           newest first: date, agent, tags, summary, link
      <agent>/YYYY-MM-DD-<slug>.md
  proof/                 optional: proof folders for work that has no repo
  projects/<app>/        CONTEXT.md and pointers (env var names only)
  skills/                reusable skills (see skills/README.md)
  tools/proof/           the proof and merge gate tooling
  templates/             ticket template
```

The `template/` folder in this kit is a small starter of this layout. Grow it as you need.

## What each file is for
| File | Rule |
|---|---|
| `PICKUP.md` | Short. Points to this charter, the role, the handoff, STATUS, and the claimed work folder. A cold session reads it first. |
| `ROLE.md` | Changes rarely. Never holds status. |
| `HANDOFF.md` | One screen. Rewrite the top each time. Fields: Status, Focus, Last step, Next, Blockers, Links, Context (low, med, high), Last compact. No diary, no transcript. |
| `ROUTINES.md` | Prompt is an intent, not a frozen tool call. State the trigger and window. One-shot watches say when they delete themselves. |
| `SKILLS.md` | Names and paths only. |
| `work/<slug>/` | README (ticket link, goal), SPEC (done-when, gates), HANDOFF. Moves to `work/archive/` when done. |
| `archive/chats/` | Cold history. Written on compact. Read only the newest matching file. |

No file holds a secret. Write the variable name or the vault path, never the value.

## Compact and clear routine
Triggers: a step finished, a durable decision, context med or high, a topic closing, a new task showing up in a standing thread.

1. **Pause** at the boundary.
2. **Archive.** Write `archive/chats/<agent>/YYYY-MM-DD-<slug>.md` with a header (`date`, `agent`, `tags` of 3 to 8 kebab words, `summary` one line, `handoff` path). Body: decisions, open loops, links. No secrets, no transcript dump. Prepend a row to `archive/chats/INDEX.md`.
3. **Compact.** Rewrite the agent `HANDOFF.md` and the claimed `work/<slug>/HANDOFF.md`. Bump `work/STATUS.md`. Set Context and Last compact.
4. **Commit and push** with `handoff(<slug>): <what>`.
5. **Clear or continue.** Context low: continue in the same thread. Medium or high, or a new task: clear, and start a fresh chat (a standing bot stays thin; new work gets `[TASK] <name>` pointed at `work/<slug>/`).

Read-back: open `INDEX.md`, filter by tag, read only the newest match and its handoff.

See the `agent-brain-handoff` and `session-compact-clear` skills in [`skills/`](skills/).
