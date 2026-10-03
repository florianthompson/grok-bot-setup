#!/bin/bash
# Step 2 of the Linear MCP push: PUT one PNG to the signed URL from prepare_attachment_upload (within 60s).
# usage: linput.sh <file> <filename> <signed-url>
f="$1"; n="$2"; u="$3"; s=$(stat -c%s "$f")
curl -s -o /dev/null -w "%{http_code}\n" -X PUT --data-binary @"$f" -H "content-type: image/png" -H "cache-control: public, max-age=31536000" -H "x-goog-content-length-range: $s,$s" -H "Content-Disposition: attachment; filename=\"$n\"" "$u"
