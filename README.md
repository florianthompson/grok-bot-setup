# How we run Grok Bot (a setup you can grow into)

This repo is also a **template**. Use it as a GitHub template, or copy [`template/`](template/) into a private `bot-brain`. The general setup (thin context + spend Claude Code instead of Grok) lives in [`TEMPLATE.md`](TEMPLATE.md).

For a focused checklist, see the [Token saving playbook](TOKEN-SAVING.md). To set up the whole fleet step by step, start with [`SETUP.md`](SETUP.md); the rules are in [`CHARTER.md`](CHARTER.md) and [`RISK-POLICY.md`](RISK-POLICY.md), the roles in [`roles/`](roles/), the brain layout in [`BRAIN-LAYOUT.md`](BRAIN-LAYOUT.md), and proof tooling in [`tools/proof/`](tools/proof/). The one-page map is [`STRATEGY.md`](STRATEGY.md) and standing owner preferences go in [`OWNER-PREFERENCES.md`](OWNER-PREFERENCES.md).

A short map for someone new to AI agents. The chat is not the source of truth. Store things on purpose, keep threads thin, and let one home bot spin the rest.

## The idea

A Grok bot is a chat with tools. It can browse, write files, talk to APIs, create other bots, and run jobs while you are away. What it "remembers" in the thread dies when the thread gets fat or you start a new one.

```
You
 └─ Home / Orchestrator          one desk that routes work
      ├─ standing bots           Home, Dev, Outreach, …
      ├─ [TASK] bots             one named chat per job, then delete
      │
      ├─ Vercel                  host the site + env / secrets
      ├─ GitHub (bot-brain)      knowledge / memory / specs
      ├─ Neon or Supabase        live data you query
      └─ Connectors              Stripe, GitHub, Slack, … (account-wide)
```

The desk decides and reviews. It does not keep production keys in the conversation, and it does not implement a whole product in the chat.

## 1. Vercel: hosting + environment variables

**What goes here**
- The website itself. Host it on Vercel. That is the default, even for a one-pager.
- API keys, database URLs, OAuth secrets. Anything that must not be in git.

**Tech stack (only if you need one)**
- A static page can be regular HTML. Do not invent a framework for a landing page.
- If you need a real app (auth, API routes, a dashboard), use **Next.js** on Vercel.
- If that app uses React, follow **React best practices** (small components, no random client state, server where it belongs). Do not cargo-cult a design system on day one.

**Why Vercel:** the running app already reads `process.env` from Vercel. One place for production, preview, and local pull (`vercel env pull`).

**Rules**
- Never paste a live key into Grok, Slack, or a GitHub issue.
- Never commit `.env`. The repo can list the *names* (`STRIPE_SECRET_KEY`). The values live in Vercel.
- If an agent needs a secret, it reads the environment or a locked secret file, not the chat.

If you are not shipping a site yet, you still want one secrets store. Vercel is fine. 1Password / Doppler works too. Pick one and stay there.

## 2. GitHub: bot knowledge and memory

**What goes here:** how the bot should behave, what it decided last time, checklists, charters, handoffs, lessons.

A private repo is the portable brain. Chat is scratch paper. The repo is the notebook it can reopen tomorrow.

```
bot-brain/
  agents/<name>/     CHARTER.md   who this bot is
                     HANDOFF.md   what it was doing
  work/<task>/       README.md    the ticket
                     SPEC.md      what "done" means
                     HANDOFF.md   next step, blockers
  work/STATUS.md     one-line board
  projects/<app>/    CONTEXT + pointers into the real product repo
```

**Rules**
- Durable decisions go in the brain the same day. "Do not send email without a human OK" is a brain fact, not a vibe.
- The product source code stays in its own repo. The brain points at it.
- Grok's per-chat memory is extra, not a replacement. If the laptop dies and the repo is gone, the bot is a goldfish.

## 3. Neon or Supabase: actual data

**What goes here:** rows you need to query. Leads, messages, users, tickets, invoices.

**Why a database, not the GitHub brain:** 1,000 leads do not belong in markdown. You cannot ask "how many email-ready shops in Greenpoint?" of a HANDOFF file.

Pick one:
- **Neon** if you want Postgres and branching.
- **Supabase** if you also want auth, storage, and a dashboard in one product.

**Rules**
- The database URL is a Vercel env var. Schema and migrations live in git.
- Agents *query* the DB. They do not dump the DB into the brain.
- Stripe, Instantly, Gmail are not the source of truth. Write back IDs if you must. Query the DB first.

## Context: keep threads thin or they get stupid

The expensive failure mode is one fat chat that "remembers" six jobs. The model starts mixing them. Tokens go up. Quality goes down.

Two moves. The home bot should do them without you asking.

| Situation | Move |
|---|---|
| Same job, new step (research → build, PR landed → next package) | **Compact.** Rewrite `work/<slug>/HANDOFF.md` in a one-screen note. Commit. Keep the same chat only if context is still light. |
| A *new* job shows up in this chat | **Compact + clear.** Write the handoff, then open a **new chat named after the task** (`[TASK] invoice VAT` or `[TASK] landing page`). Do not execute the new job in the fat thread. |
| Context feels medium or high | Clear before more heavy work. A summary in the brain beats a 200-message thread. |

**Named chats**
- Standing bots (Home, Dev, Outreach) stay thin. They route. They do not become junk drawers.
- New work always gets a `[TASK] <short name>` bot pointed at `work/<slug>/`.
- When the task is done, keep the handoff in the brain. Delete the `[TASK]` bot from the sidebar (right-click the row → Delete) so the list stays clean.

**What a handoff looks like (one screen, not a transcript dump)**
- Goal
- Done-when
- What already happened
- Next step
- Blockers / do-nots

Tomorrow any bot can pick that file up cold. That is the whole point.

## One home bot that sets up the others

Do not start with fifteen specialists. Start with **one home bot** (call it Home, Desk, Orchestrator, whatever). Its job:

1. Hear you.
2. Decide if this is a standing role or a one-off task.
3. Create the bot if it does not exist (Grok can spin a teammate with a name + a short description).
4. Point that bot at `work/<slug>/` or `agents/<name>/CHARTER.md`.
5. Stay the control plane. Do not do the heavy work in the home thread.

**Day-one roster (grow into this, do not clone it on hour one)**

| Bot | Lives forever? | Job |
|---|---|---|
| Home / Orchestrator | yes | Route, compact, create bots, talk to you |
| Dev / Engineer | yes | Spec + review. Claude Code implements |
| A life/home bot | optional | Calendar, family, personal inbox |
| `[TASK] …` | no | One job. Delete when done |

Home messages the specialist. The specialist does not need you to copy-paste context if the brain file is good.

You delete bots from the sidebar (right-click → Delete). Home can create them. It cannot delete them. That is fine. You are the janitor of the list.

## Connectors: how tools like Stripe get to every bot

You do not need a clever hub that proxies Stripe through Home. That is the wrong picture.

**Connectors live on your Cursor account, not inside one bot.** Install Stripe (or GitHub, Slack, Neon, …) once. A connect card pops up. You sign in. After that, **every bot in the account can use it.** Skills that ship with the plugin are global too.

So:

```
You connect Stripe once
      ↓
Home, Dev, [TASK] invoice bot
all see the same Stripe connector
```

Home's real job is *routing* ("Dev, pull last month's payouts"), not *owning* the API key.

**How to add a tool**
1. Tell Home "connect Stripe" (or GitHub, Slack, Linear, …).
2. It searches the catalog and installs the plugin. You confirm.
3. You tap the connect card and authorize. Do not paste tokens into chat.
4. Next message, any bot can call it.

If there is no connector, Home can add a remote MCP URL you already have, or reach the site through the shared computer's browser. Do not invent a second secrets path.

**What is actually shared vs not**

| Shared across every bot | Per bot |
|---|---|
| Connectors (Stripe, GitHub, …) | Chat transcript |
| Plugin skills | Routines you attach to that bot |
| The GitHub brain repo | Its name, description, persona |
| The shared computer (files, installed CLIs, browser logins) | Its own screen / desktop |

That last line matters. One computer, many bots. A `gh` login or a file in the workspace is there for all of them. Each bot still has its own chat and its own routines.

**Do not** build "Home holds every key, other bots ask Home for Stripe." You will serialize everything through one fat thread and pay for it. Connect the tool to the account. Let the specialist call it. Home only coordinates.

## Automations: a pro setup you grow into

A routine is a saved prompt plus a trigger. It runs while you are away. Attach it to the *right* bot (Home for "what should I see this morning", Dev for "this PR merged").

Open a bot's info pane (click its name in the chat header) to see its Routines list.

**Prefer an event over a timer.** If GitHub can tell you a PR merged, do not poll every 20 minutes.

**Start tiny.** Three weekday routines beat twenty that fire at 3am.

### Week 1 (enough)

1. **Morning desk** (Home), weekdays 8:00: read `work/STATUS.md`, list what is blocked, ping you only if something needs a human.
2. That is it. Use the bots by hand for a few days so you know what you would have automated badly.

### Week 2 (when the morning note is useful)

3. **PR babysitter** (Dev): listen to one repo for review requested / CI failed / merged. Delete itself after merge if it was for a single PR.
4. **Inbox or Slack mention** (Home or a Messages bot): only if you already connected that connector.

### Later (only when a repeat shows up twice)

5. A weekly "compact the brain / STATUS.md is stale" reminder.
6. A deploy or CI listener on `main`.
7. Life stuff (meds, a trip, a bill) on the life bot, all seven days if it is actually life.

**How to write a routine prompt:** the *intent*, not a frozen recipe. "Check STATUS and ping me if a blocker is older than two days." Not "call tool X with argument Y". Connectors change. The intent should not.

**Windows:** weekday daytime is the default. "Daily" does not mean Saturday at midnight. Name a clock time ("8am") and it stays 8:00. Overnight and weekends only when you said so, or when the thing is actually life-or-incident.

**Kill switches:** a one-shot watch should delete itself when the condition hits (PR merged, deadline passed). A standing digest stays. If a routine keeps failing auth, pause it and reconnect. Do not let it nag forever.

## The engineering bot (save tokens)

Grok is expensive if you let it write the whole app in the thread.

**Grok stays the desk: claim the work, write the spec, review the result.**
**Implementation runs on the Claude Code subscription, on the shared computer, in a fresh folder per ticket.**
**Do not implement in Grok threads. Do not spin a Cursor cloud agent for ordinary repo work.**

```
idea  →  Grok writes SPEC + HANDOFF in the GitHub brain
      →  Claude Code implements (fresh folder per ticket)
      →  PR in the product repo (Next.js on Vercel if it is an app)
      →  Grok reviews, you merge
```

Talk is cheap in Grok. Code is Claude Code.

If the site is just HTML, Claude still ships it to Vercel. No Next.js required.

## How a normal day looks

1. You tell Home a thing.
2. Home reads the brain (who we are, what is in flight).
3. New job → compact the old one, spin `[TASK] …`, point it at `work/<slug>/`.
4. Same job, new step → compact the handoff, keep going only if the thread is still thin.
5. Data lives in Neon/Supabase. Secrets stay in Vercel. Stripe is a connector, not a paste.
6. Dev specs. Claude Code builds. Home reports the outcome.
7. A routine pings you only when a human has to move.

## What not to do

| Don't | Do |
|---|---|
| Put `DATABASE_URL` in the GitHub brain | Vercel env |
| Store 2,000 leads in `HANDOFF.md` | Neon/Supabase |
| Keep the only copy of a decision in a 200-message chat | `work/<slug>/HANDOFF.md` |
| Pile a second job onto Home | Compact + `[TASK] …` |
| Let Grok "just quickly implement" | Spec, then Claude Code |
| Start with 12 standing bots | Home + one specialist + tasks |
| Proxy every tool through Home | Connect once on the account |
| Poll Slack every 5 minutes | Event listener |
| Framework a one-pager | HTML on Vercel |
| Skip React hygiene in a Next app | React best practices |

## Starter kit (in order)

1. One Home bot. Give it a one-paragraph job: route, compact, create task bots, do not implement.
2. Private GitHub repo `bot-brain` with `agents/home/`, `work/STATUS.md`.
3. Vercel project. Host the site there. Env vars only there.
4. Site: HTML if that is enough. Next.js if it is an app. React best practices if it is React.
5. Neon *or* Supabase. One. Migrations in the app repo.
6. Connect GitHub. Then Stripe (or whatever you actually use). One connect card each. Do not paste keys.
7. Standing rule on the engineer bot: Grok specs, Claude Code builds.
8. First `[TASK]` the next time a real job shows up. First weekday 8am routine once STATUS.md is real.
9. Add a specialist only when a domain is noisy enough (Dev, Messages, a life bot).

That is a pro setup you can grow into. Chat is the control plane. Files, env, tables, and account-level connectors are the system.
