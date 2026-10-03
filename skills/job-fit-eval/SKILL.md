---
name: job-fit-eval
description: Use when scoring a real job posting against a candidate profile kept in the brain. Requires an actual posting.
---
# Job fit evaluation

Do not analyze until a real posting exists.

## Inputs
- The posting text or link.
- The candidate profile at `projects/<candidate>/PROFILE.md` in the brain: background, strengths, preferences (location, remote, level), and any facts that must not be misstated. Keep it factual and current.

## Rules
- Be direct. Do not flatter.
- Judge against the actual posting, not a generic role.
- Do not invent weaknesses the profile does not state.
- Do not treat a missing credential as a gap if the posting does not ask for it and the profile shows equivalent work.
- Quote the posting for every must-have you score.

## Output
- Fit: strong, mixed, or weak
- Why (3 bullets max)
- Gaps, if any
- Working-style and culture match
- One sentence on whether a conversation is worth it
