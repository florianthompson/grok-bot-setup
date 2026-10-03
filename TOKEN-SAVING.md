# Token saving playbook for Grok Bot + Claude Code + Linear

A practical guide for keeping Grok Bot conversations short while Claude Code handles implementation and Linear keeps work organized.

## Setup: one front door, thin desks

1. **One Orchestrator bot as your only chat.** Other bots send questions for you to it marked **NEEDS <OWNER>**, and it forwards each one right away. **Benefit:** You read one place, and questions never get lost.
2. **Grok chats are thin desks.** They claim work, write specs, review results, and handle approvals. They never write code. **Benefit:** Planning and review are cheap; expensive coding happens elsewhere.
3. **Use a few standing bots, such as Orchestrator, PM, and Dev, instead of a new bot per task.** **Benefit:** Fewer chats wake up, and fewer copies of the same context are loaded.

## Claude Code does the heavy work

4. **Run all coding in Claude Code on the shared box, billed to a Claude plan rather than Grok Bot usage. Keep cloud coding agents off by default.** **Benefit:** The heaviest token use moves to a flat rate plan. One setup saw plan usage jump from 15% to 50% with cloud agents before switching.
5. **Use a fresh Claude Code session for each ticket in its own folder. When it is done, stop the session and archive the folder.** **Benefit:** Each session loads only its task, and no leftover workers continue running.
6. **Use one cheaper default model, such as Sonnet, set in `~/.claude/settings.json` and passed with `--model` on every launch.** **Benefit:** Lower cost per session, faster work, and predictable quality.

## Linear is the source of truth

7. **Use the flow Orchestrator to PM to Dev.** PM creates or updates the Linear issue, and Dev works only on tickets with a Linear ID. **Benefit:** Roles are clear, and duplicate work is reduced.
8. **Make every ticket self contained.** Include a short spec with the goal, scope, and acceptance criteria; a linked branch named after the issue; an early draft PR; frequent commits; and short progress comments. **Benefit:** Any agent can finish it cold, and chats never need to re explain history. This is the biggest saving after Claude Code.
9. **Keep one Linear document of open approvals, maintained by the Orchestrator.** **Benefit:** You can decide in one pass.

## Fewer messages

10. **Bots message the Orchestrator only for a finished ticket with proof or a question for the owner.** No progress pings, acknowledgements, or thanks. **Benefit:** Every message wakes a bot and costs tokens.
11. **PM sends one line per finished ticket:** a plain name linked to Linear, the result, and links. **Benefit:** It is quick to read and cheap to send.
12. **Send non urgent bot messages as informational so they do not wake the receiver.** **Benefit:** No extra turn is needed.
13. **Keep routines and bots silent when nothing changed.** **Benefit:** No tokens are spent on no news.

## Shorter replies

14. **Make replies one or two sentences, with the main point first, links instead of pasted content, and no recaps.** **Benefit:** Less to read and fewer tokens per turn.
15. **Use screenshots only when there is a design to look at, never for test output or code.** **Benefit:** Images are expensive.
16. **Use plain ticket names linked to Linear, not bare IDs.** **Benefit:** The work is understood at a glance.

## Memory and history

17. **Use a shared GitHub brain repo with a short `HANDOFF.md` per bot, plus dated chat archives with an `INDEX`.** **Benefit:** Every bot shares facts without relying on long chats.
18. **Compact when a topic closes.** Write decisions, open loops, and links to the brain; keep going in the same chat; and on wake read only the newest matching handoff. **Benefit:** Chats stay small and loads stay short.
19. **Prune memory.** Merge duplicate rules and delete superseded ones. **Benefit:** Memory loads every turn, so the savings repeat on every message.
20. **Write standing rules once in a `CHARTER` file in the brain and point to it.** **Benefit:** Instructions are not repeated, and there is one version.

## Risk based approvals

21. **Auto merge low risk changes, such as copy, styling, previews, and test scripts, once proof passes. Keep database changes, payments, secrets, live themes, and client emails gated for the owner.** **Benefit:** There are fewer approval round trips, while risky changes remain gated.
