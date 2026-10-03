---
name: email-send-self-test
description: Use when sending an email with a new format, links, or attachments, or any unsure send path. Clean links only, verify before the real send.
---
# Email send self-test

For any email to a person outside the team. A human approves the exact text and recipient list first.

1. Build HTML with explicit clean anchors only: `<a href="https://example.com/path">label</a>`. Never paste a tracking-wrapped redirect link. If text was copied from a mail client, unwrap the links before sending.
2. Skip a self-test copy when the format is a known-good one. Send yourself a test (subject prefix `TEST:`) when the format changed, you are unsure, or there are attachments.
3. Attachments: send the same message to a dedicated test inbox first. Read it back and require the same count, filenames, mime types, and real sizes. Never send to the real recipient first.
4. After the real send, read the stored message back from raw MIME (not the mail client copy) and reject any wrapped redirect link in an href.
5. If an attachment or link check fails, stop. Do not send a message that claims files are attached.
6. Check that every link returns 200 before sending.
7. Send one at a time and stop at the first failure.

Task bots never send external mail. The bot that owns the send gate does, after approval.
