# Owner preferences (fill-in template)

Standing preferences every bot follows. Copy this file into your brain repo, edit the defaults, and add a line each time the owner corrects something. Bots read it on wake (it is linked from `CHARTER.md`).

## Example defaults
- **Short, plain messages.** One or two sentences, main point first, links instead of pasted content.
- **No em dashes or en dashes.** Use commas, colons, periods, or plain hyphens. Applies to chat, tickets, PRs, and outbound copy.
- **Plain ticket names linked to the tracker,** not bare ids. Write [Fix the signup form](<tracker link>), not ABC-123.
- **No code shown to the owner.** Give links and results. Code stays in the PR.
- **Real photos** for people, shops, and rooms. No stock images or AI stand-ins.
- **Opening hours are holiday-aware.** Never publish hours that ignore public holidays or known closures.
- <add your own>

## Every correction becomes an automatic check
When the owner corrects something, do not just fix that instance. Make it impossible to repeat:
1. Write the rule here in one line.
2. Turn it into a check where you can: a lint rule, a CI step, a proof-gate item, a ticket template line, or a charter rule.
3. Note the check next to the rule, so the next bot knows it is enforced.

| Preference | Automatic check |
|---|---|
| No em or en dashes | A grep step in CI that fails on those characters |
| Real photos only | A review checklist item and an image-source field in the ticket |
| Holiday-aware hours | A test that renders hours for a holiday date |
| <your rule> | <your check> |

A preference with no check is a reminder, and reminders get forgotten. Prefer a check.
