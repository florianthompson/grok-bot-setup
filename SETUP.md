# Setup guide

From nothing to a first merged pull request. Assumes a Grok Bot account, a GitHub account, a Linear workspace, and a Claude plan. Placeholders: `<your-org>`, `<brain-repo>`, `<model>`, `ABC-123`.

## 1. Create the private brain repo
1. On GitHub, use this kit as a template (or copy it) into a **private** repo named `<brain-repo>` under `<your-org>`. Keep this guide repo public if you like; the brain is private.
2. Keep or copy into the brain: `CHARTER.md`, `RISK-POLICY.md`, `BRAIN-LAYOUT.md`, `roles/`, `skills/`, `templates/`, `tools/proof/`, and the starter `template/` folder contents at the repo root (`agents/`, `work/`, `projects/`, `archive/`, `PICKUP.md`).
3. Edit `CHARTER.md`: set the owner name, the default model, the timezone, and your approval rules. Edit `RISK-POLICY.md` path rules for your stack.
4. Commit and push. Confirm the repo is private.

Rule from day one: no secrets in this repo. Variable names only.

## 2. Connect the tools (once, on the account)
Connectors live on the account, not on one bot. Connect each once and every bot can use it.
- **GitHub:** grant access to `<brain-repo>` and to your product repos.
- **Linear:** the tracker. Create a team and an issue template from `templates/LINEAR-TICKET.md`. Keep the GitHub integration from auto-closing issues on merge (Done is set after the Approval record).
- **Hosting and secrets store:** pick one place for environment variables (your host's env store or a password manager). Never paste a key into a chat.
- **Data (only if needed):** one Postgres provider. Migrations live in the app repo.
- Add others (payments, chat, mail) only when a ticket needs them. Connect through the connect card; do not paste tokens.

## 3. Install Claude Code on the shared computer
1. Install the CLI and sign in with the plan that will do the work.
2. Set the default model in `~/.claude/settings.json`: `{"model": "<model>"}`.
3. Configure git once: `git config --global user.name "<owner name>"` and `git config --global user.email "<owner address>"`. Authenticate `gh` (`gh auth login`).
4. Create the workspace folders: `tasks/` and `tasks/archive/`. One subfolder per ticket.
5. **Workspace trust:** the first time Claude opens a folder it asks to trust it. Open each new `tasks/<slug>` once interactively (or pre-trust it) so background runs are not blocked by the prompt.

## 4. Launch pattern
From the ticket folder, with the prompt before the remaining flags:

    cd tasks/<ticket-slug>
    claude --bg --model <model> --permission-mode auto "<prompt>"

Operate it:

    claude agents                      # list sessions
    claude logs <session>              # read what it is doing
    claude stop <full session id>      # stop it
    claude --resume <full session id>  # continue a stopped session

Always use the full session id. Never stop things with `pkill -f` or `killall`. Do not pass `--dangerously-skip-permissions` unless the owner said so. One folder and one session per ticket.

## 5. Create the first standing bots
1. **Orchestrator** first. Paste `roles/ORCHESTRATOR.md` and a pointer to `<brain-repo>` as its description. It is the only chat you talk to.
2. **PM** from `roles/PM.md`. It owns Linear.
3. **Dev** from `roles/DEV.md`. It launches Claude Code.
4. Create `agents/<slug>/` in the brain for each (`ROLE.md`, `HANDOFF.md`, `ROUTINES.md`, `SKILLS.md`) from `template/agents/_bot/`.
5. Tell each: "This repo is your brain. On wake, pull it and read `PICKUP.md`."
Add specialists later, only when a domain gets noisy. Use `[TASK]` bots for one-off jobs (see `roles/OTHER-BOTS.md`).

## 6. First ticket
1. Tell the Orchestrator what you want. It hands PM the ask.
2. PM writes the ticket from `templates/LINEAR-TICKET.md`: problem, scope, non-scope, risk, acceptance, proof plan. Start with a small risk A ticket (a docs change).
3. Branch named after the issue (`abc-123-short-name`), early **draft** PR.
4. Dev makes `tasks/abc-123-short-name`, writes `PROMPT.md`, launches Claude Code, watches the logs.
5. Claude commits often, writes `RESULT.md`, and generates the proof.

## 7. Proof gate
1. Copy `tools/proof/` (and `proof.yml.template` as `.github/workflows/proof.yml`, plus `scripts/proof/`) into the product repo.
2. For a UI ticket: `python3 tools/proof/make_proof.py --ticket ABC-123 --repo-dir . --base-url <preview url>` makes desktop and 390 px shots and `proof/ABC-123/proof.json`. For non-UI: add `--proof-kind non-ui --result "<check output>"`.
3. Commit `proof/ABC-123/` last.
4. Put the evidence in the PR body (see `tools/proof/MERGE-GATES.md`) using `gh api -X PATCH repos/<your-org>/<repo>/pulls/<n> -F body=@pr-body.md`.
5. Run `node tools/proof/proof_gate.mjs ABC-123 proof/ABC-123/proof.json`. It must print PASS.
Tests for the tooling itself: `cd tools/proof && node --test *.test.mjs` (Node 22 or later).

## 8. PR flow to merge
1. Dev reports DONE to PM (format in `roles/DEV.md`).
2. PM reviews: reruns the gate, maps acceptance items to evidence, checks CI and the diff, confirms the risk label.
3. **Risk A:** PM writes the Approval record and merges (`gh pr ready`, then `gh pr merge --squash --match-head-commit <sha>`). **Risk B:** PM asks the Orchestrator, which asks you with `NEEDS <OWNER>`; merge only after your OK is linked in the record.
4. PM sets the ticket Done and sends the Orchestrator one line.
5. Dev retires the task folder (`skills/retire-task-folder`).
6. Compact the handoffs (`skills/session-compact-clear`).

## 9. Checklist before you rely on it
- [ ] Brain repo is private and has no secrets.
- [ ] Default model set and passed on every launch.
- [ ] Git author configured on the shared computer.
- [ ] Orchestrator, PM, Dev exist and each wrote a `HANDOFF.md`.
- [ ] A risk A ticket went from ticket to merged PR with a PASS gate.
- [ ] You know where approvals for risk B land (the Orchestrator).
