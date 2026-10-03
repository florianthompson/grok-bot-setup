# Strategy: the whole approach on one page

Chat is the control plane. Files, a tracker, and gates are the system.

- **Roles and routing.** The owner talks only to the Orchestrator. Anything for the owner goes there marked `NEEDS <OWNER>` with a plain-named ticket link. The Orchestrator routes to PM (tracker) and Dev (building). Specialists and `[TASK]` bots only when a domain is noisy or a job is one-off. See [`roles/`](roles/).
- **Claude Code is the doer.** Grok bots are thin desks that spec, route, review, and gate. All building runs in Claude Code, one fresh folder and session per ticket, one default model passed on every launch. See [`skills/thin-desk-claude-code`](skills/thin-desk-claude-code/SKILL.md).
- **The tracker is the source of truth.** Every ticket is self-contained, from [`templates/LINEAR-TICKET.md`](templates/LINEAR-TICKET.md): problem, scope, risk, acceptance, proof, session comments. A branch named after the issue and an early draft PR.
- **Risk A and B.** A (docs, copy, UI, tests, tooling) merges when proof and CI pass. B (prod, money, customer-visible) waits for the owner's OK. See [`RISK-POLICY.md`](RISK-POLICY.md) and the gates in [`tools/proof/MERGE-GATES.md`](tools/proof/MERGE-GATES.md).
- **Definition of done.** The owner sees the working feature: desktop and 390 screenshots plus a link, tested like a real end user, or a non-UI proof with a result line and a link. Code tests are extra, never the proof. See [`CHARTER.md`](CHARTER.md).
- **Dogfood your own product's tools.** If you build a tool for customers, run your own operations through it. A missing capability becomes a ticket for the product, not a workaround.
- **Lean tokens.** Few standing bots, short messages, silence when nothing changed, screenshots only for design. See [`TOKEN-SAVING.md`](TOKEN-SAVING.md).
- **Compact and handoff.** Rewrite a one-screen `HANDOFF.md` after each step, archive and clear when context grows. See [`BRAIN-LAYOUT.md`](BRAIN-LAYOUT.md) and [`skills/session-compact-clear`](skills/session-compact-clear/SKILL.md).
- **Prune memory.** Merge duplicate rules, delete superseded ones. Memory loads every turn.
- **Per-bot pickup.** A cold bot reads `PICKUP.md`, then its `agents/<slug>/` files (`ROLE.md`, `HANDOFF.md`, `ROUTINES.md`, `SKILLS.md`), then the board. See [`template/PICKUP.md`](template/PICKUP.md).
- **Owner preferences.** Standing preferences live in [`OWNER-PREFERENCES.md`](OWNER-PREFERENCES.md), and every correction becomes an automatic check.

Start here: [`SETUP.md`](SETUP.md). Rules: [`CHARTER.md`](CHARTER.md).
