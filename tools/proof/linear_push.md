# Pushing proof to Linear through the MCP

Rule: proof lives in Linear. The issue must end up with the desktop and 390px screenshots, the preview URL and the PR.

Run the gate first so you have a plan file:

    node proof_gate.mjs ABC-123 proof/ABC-123/proof.json --linear-plan plan.json

Only a PASS writes a plan. The plan has `issue`, `links[]`, `files[]` and `comment`.

## Steps (Linear MCP)

1. Links. Call `save_issue` with `id` = the issue and `links` = the plan's `links` (`[{url, title}]`). This attaches the PR and the preview or live URL.
2. For every entry in `files[]`, do these three in a row, quickly. The upload URL expires, so finish within 60 seconds per file:
   1. `prepare_attachment_upload` with the issue, `filename`, `contentType`, `size`. It returns `uploadUrl`, `headers` and an upload id or `assetUrl`.
   2. `curl -X PUT "<uploadUrl>" -H "<header1>" -H "<header2>" ... --data-binary @<absPath>`. Send the returned headers verbatim, plus `Content-Type: <contentType>`. Do not echo them in your report. Expect HTTP 200.
   3. `create_attachment_from_upload` with the issue, the upload id and the `title`. Keep the resulting asset URL.
3. Comment. Call `save_comment` on the issue with the plan's `comment`, followed by one `![title](assetUrl)` line per uploaded file (desktop and 390px at least), so the images show inline.
4. Check. Read the issue back (`get_issue`) and confirm the attachments list has the PR, the preview URL and the screenshots.

## Direct API alternative

`node proof_gate.mjs <TICKET> <proof.json> --push-linear` does the same through the GraphQL API when `LINEAR_API_KEY` is set (`fileUpload`, then PUT, then `attachmentCreate`, then `commentCreate`). It has not been run against the real API yet.

## Status
The MCP path is the tested one. The GraphQL `--push-linear` path is untested until you provide `LINEAR_API_KEY` (never commit it).
