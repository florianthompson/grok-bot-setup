---
name: tasks-dashboard
description: Use when the owner wants a simple task board page rebuilt from an append-only inbox log.
---
# Tasks dashboard

Rebuild a read-only board from the real log. Do not invent tasks.

## Inputs
- A design mock of the board (one HTML file).
- An append-only log, one JSON object per line: `id`, `title`, `status`, `source`, `created`, optional `outcome`.
- A small builder script that renders the board from the log plus a map of known outcomes.

## Steps
1. Run the builder: `python3 <builder>.py --log <log.jsonl> --mock <mock.html> --out board.html`.
2. Attach `board.html` in chat. Do not publish it to a public URL: it can contain customer mail.
3. When a task finishes, add its outcome (what was done and why) to the known-outcomes map so Done cards show a short ledger.

## Status rules
- `queued`, `working`, `done` only.
- Email-sourced cards use `source: "email"`.
- One task in flight at a time.
- Prefix titles with the customer's short name.

If you later build the board as a real page, put it behind login.
