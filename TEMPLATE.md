# Template: a Grok bot that stays cheap and sharp

Copy this repo (or the `template/` folder into your own private `bot-brain`). It is a starting kit, not a religion.

Two problems this solves:

1. **Context rot.** One fat Grok chat that "remembers" six jobs gets expensive and dumb.
2. **Wrong subscription.** Grok is a desk. If you already pay for Claude Code (or another coding agent), that subscription should do the long work.

His Grok can pull this repo and adopt the charters below as standing rules.

## What you copy

```
template/
  agents/home/CHARTER.md     the desk: route, compact, create bots
  agents/dev/CHARTER.md      spec + review; Claude Code implements
  work/STATUS.md             one-line board
  work/_ticket/              README + SPEC + HANDOFF blanks
  projects/_app/             CONTEXT + pointers blanks
```

Rename `_ticket` to a real slug (`landing-page`). Rename `_app` to the product (`my-saas`). Make `bot-brain` private even if this guide repo is public.

## Setup in order

1. Create a **Home** bot. Paste `template/agents/home/CHARTER.md` into its description (or tell it to follow that file in your brain repo).
2. Private GitHub repo `bot-brain`. Copy `template/` into it. Commit.
3. Tell Home: "This repo is your brain. On wake, pull it. New work gets `work/<slug>/`. Do not implement in this chat."
4. Connect GitHub so Home can read/write the brain. Other tools (Stripe, Slack, …) connect once on the account. Every bot sees them.
5. When a real coding job shows up, create **Dev** from `template/agents/dev/CHARTER.md`.
6. Sign Claude Code in on the shared computer. That is the doer subscription. Grok does not write the app.

Host the site on Vercel. HTML if that is enough. Next.js if it is an app. React best practices if it is React. Env vars only on Vercel.

## Context rules (Home enforces these)

| Situation | Move |
|---|---|
| Same job, new step | **Compact.** One-screen `HANDOFF.md`. Stay in-thread only if context is still light. |
| New job in this chat | **Compact + clear.** Write the handoff. Spin `[TASK] <short name>`. Do not run the new job in the fat thread. |
| Context feels medium/high | Clear before more heavy work. Files beat a 200-message transcript. |

A handoff is one screen: goal, done-when, what happened, next step, do-nots. Not a dump of the chat.

Delete finished `[TASK]` bots (sidebar, right-click, Delete). Keep the files.

## Maximize the second subscription

You already pay for Grok *and* something that is better at long coding (Claude Code is the one we use). Treat them as different machines.

```
You → Grok (desk, short context)
        writes SPEC.md + HANDOFF.md
        ↓
      Claude Code (doer, fresh folder per ticket)
        implements, tests, opens the PR
        ↓
      Grok reviews the PR, you merge
```

**Grok may:** claim the work, ask one clarifying question, write a spec, review a diff, talk to you.

**Grok may not:** implement the feature in the thread, run a 40-step debug loop, re-do Claude's verification "just to check", spin a Cursor cloud agent for ordinary repo work.

**Claude Code (or your second sub) may:** git, tests, refactors, deploys, Neon queries, anything that burns tokens on volume.

Why this is cheaper:
- A 20-line SPEC is a few Grok tokens. A 400-file refactor in Grok is a bill.
- Claude Code is already paid. Use the plan you have.
- Fresh folder per ticket (`/workspace/tasks/<slug>` or whatever you use) so Claude does not inherit a dirty cwd.
- Review stays a short Grok turn: read `RESULT.md` or the PR, tell you.

Swap "Claude Code" for Codex, Cursor Tab, Copilot Workspace, whatever you already pay for. The rule is the same: **the expensive chat is the desk. The managed coding sub is the factory.**

## What "managed" means here

Claude Code (and similar) is a signed-in CLI or app on the shared computer. You do not paste that session into Grok. You do not re-implement its loop in the Grok thread.

Home / Dev write `work/<slug>/SPEC.md` with:
- goal
- constraints
- done-when
- gates (do not send email, do not publish, do not spend money)

Then they start Claude in that ticket folder and wait for `RESULT.md` (or a PR URL). That is the whole interface.

## First week without overbuilding

- One Home bot. One private brain repo. No specialists yet.
- First real job → first `[TASK]` + `work/<slug>/`.
- First coding job → create Dev, hand SPEC to Claude Code.
- First weekday 8am routine only after `STATUS.md` has real rows.

Do not create twelve standing bots on day one. Do not proxy Stripe through Home. Connect tools on the account.

## For the friend's Grok

If you pulled `<your-org>/grok-bot-setup (this kit)`:

1. Read this file and `README.md`.
2. Copy `template/` into a private `bot-brain`.
3. Adopt `agents/home/CHARTER.md` as your standing rules.
4. Ask the human which coding subscription they already pay for. Put that name in Dev's charter. Default: Claude Code.
5. Do not implement the next feature in this chat.

## Going further: the full kit

This repo now carries the rest of the operating model:

- [`SETUP.md`](SETUP.md): step-by-step setup, from the private brain repo to the first merged PR.
- [`CHARTER.md`](CHARTER.md) and [`RISK-POLICY.md`](RISK-POLICY.md): fleet rules and who approves what.
- [`roles/`](roles/): Orchestrator, PM, Dev, and notes on other bots and `[TASK]` bots.
- [`BRAIN-LAYOUT.md`](BRAIN-LAYOUT.md): what lives in the brain repo.
- [`tools/proof/`](tools/proof/) and [`tools/proof/MERGE-GATES.md`](tools/proof/MERGE-GATES.md): proof and merge gates, with tests.
- [`templates/LINEAR-TICKET.md`](templates/LINEAR-TICKET.md): the ticket template.
- [`skills/`](skills/README.md): reusable generic skills.
