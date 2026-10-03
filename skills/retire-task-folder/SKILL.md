---
name: retire-task-folder
description: Use when a ticket is done, the final message was sent, or the owner says complete: stop the session in that folder and archive it.
---
# Retire task folder

## Steps
1. Confirm the slug (`tasks/<slug>`).
2. Do not retire while a send or PR is still in flight.
3. Stop the session by its full id: `claude agents` to find it, then `claude stop <full session id>`. If a stray process remains, kill only the exact PID you verified belongs to that folder (check with `ls -l /proc/<pid>/cwd`). Never `pkill -f` or `killall`.
4. Move the folder: `mv tasks/<slug> tasks/archive/$(date +%F)-<slug>`. If the target exists, add a suffix.
5. Leave the chat. A later follow-up gets a new folder.
6. Mark `work/<slug>/HANDOFF.md` as retired, move it to `work/archive/<slug>/`, drop the row from `work/STATUS.md`, commit.
