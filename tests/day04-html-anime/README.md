# Day 4: blixvip/html-anime

**Claim:** "This anime was drawn in HTML. No video model." You write one scene; a coding agent draws the film in HTML.

## The tests
Both runs: headless Claude Code on Sonnet (claude-sonnet-5-5), one prompt each, in a fresh copy of the repo. Billed to the Anthropic API.

| Test | Prompt | Time | Cost | Result |
|---|---|---|---|---|
| `test1-lantern/` | girl releases a lantern past a red moon, 12 s, 9:16 | 6 min | $0.88 | simple flat cartoon, on-brief |
| `test2-fight/` | two rival shinobi clash on a collapsing bridge, 12 s, 9:16 | 8 min | $1.13 | real fight beats, still flat style |

Each folder has `prompt.txt`, the film's `index.html` (exactly as the agent wrote it), and `TRANSCRIPT.md`.

**Rendering:** the agent had no browser in its sandbox, so it never watched its own film. I rendered each with `npx hyperframes render` (v0.8.225). The only change was loading GSAP 3.14.2 from a local copy because my sandbox blocks the CDN; the film code is untouched.

## What I found
- The repo's showcase film (*Kokuyō*, 80 s, 16:9) ships only as an MP4. Its HTML source isn't in the repo, so it can't be reproduced or checked.
- The shot-sheet workflow makes 8, 12 or 20 s films. A separate 60 s film CLI exists; the repo's docs say it "has not been validated end-to-end" and its preview art is "deliberately basic".
- The repo's own example film (`films/roof`, 8 s) is in the same flat style as my two tests.

**Verdict: HALF FACT.** Anime drawn in HTML is believable. Getting that demo from one prompt is not what I got.
