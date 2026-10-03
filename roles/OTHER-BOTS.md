# Other standing bots and [TASK] bots

Start with Orchestrator, PM, and Dev. Add a specialist only when a domain is noisy enough to pollute those threads.

## Common specialists
Each gets a folder `agents/<slug>/` in the brain with `ROLE.md`, `HANDOFF.md`, `ROUTINES.md`, `SKILLS.md`.

| Bot | Owns | Never |
|---|---|---|
| Outreach | Drafting first-touch messages, tracking replies. Drafts only. | Send without the owner's yes for that exact batch. |
| Messages / Inbox | Day-to-day client email triage and drafts. | Send an unapproved reply. Leave an email unanswered without a note. |
| Life / Home | Personal reminders and follow-ups. | Touch work tickets or work secrets. |
| Researcher | Read-only fact finding, writes a short note to the brain. | Take external actions. |

Every specialist follows the same rules: wake by pulling the brain, rewrite `HANDOFF.md` after each step, report to the Orchestrator only for a finished ticket with proof or a `NEEDS <OWNER>` question.

## [TASK] bots (one job, then gone)
- Use for a single finite job that would pollute a standing thread. Name the chat `[TASK] <short name>`.
- Point it at `work/<slug>/` (README + HANDOFF). It reads those files, not the old chat.
- Role is narrower than a standing bot: it has no routines and creates no other bots.
- Done: write the final `HANDOFF.md`, move the folder to `work/archive/<slug>/`, delete the chat from the sidebar. The files stay.
- A [TASK] bot never sends external messages. Hand the draft to the bot that owns that gate.

## Handoff format (any specialist)

    DONE: <plain name> (<link>)
    Result: <one line>
    Needs: <none | NEEDS <OWNER>: question>
    Brain: <path to the updated HANDOFF.md>
