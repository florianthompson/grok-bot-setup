---
name: send-readiness
description: Use when verifying a prepared outbound campaign batch before any send or activation. Report only. Never sends to real recipients.
---
# Send readiness (report only)

The desk is the outreach bot. The doer is Claude Code.

## Hard gates
- Never activate a campaign, never launch, never send to a real recipient.
- An isolated test is allowed only after the owner names that step: one test lead on a dedicated test inbox.
- Do not change campaign copy or load real drafts unless the owner approved that exact write.
- Define "sendable" once, in the ticket: a valid address, passes suppression and status filters, has the fields the template needs. Exclude anyone marked lost or unsubscribed.

## Message shape
One observation about the recipient's real site that you can defend, then a small ask. No fake visit, no price, no jargon.

```text
Hi {{FIRST_NAME or brand}},

On {{DOMAIN}} {{OBSERVATION}}.

I made a version that feels like your business.

Mind if I send it?

{{SENDER}}
```

## Do
1. Re-query the lead store. Count sendable leads by segment. Diff against the last snapshot.
2. Read-only fetch the campaign drafts. Confirm they are drafts with zero sent.
3. List drift: empty required fields, extra leads in the campaign, mailbox mismatches, company name used as a first name.
4. Render a few local samples from real rows. Do not write to the campaign tool.
5. Write a test plan for one isolated test lead. Do not add the lead until the owner says.
6. Write `RESULT.md` in the task folder. No secrets.

## Done
A number the owner can act on (sendable now, sendable after exclusions), a few rendered samples, and one line on what still blocks a test send.
