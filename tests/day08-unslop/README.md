# Day 8: heydamir/unslop, tested Nov 8 2026

Claim: "A Claude skill that turns vibecoded, AI-looking UI into a designed interface." 11.7k stars, 649 forks (Nov 8).
Setup: Claude Sonnet (claude-sonnet-5-5) via direct API, same model for both sides.
- Skill side: system prompt = the skill's SKILL.md + references (signs, tokens, visuals); told to skip questions, no image tool.
- Control side: "Make this page look less AI-generated and more like a designed interface."

## Test 1: the repo's own demo (examples/dashboard.html)
| Run | Input tok | Output tok | Total |
|---|---|---|---|
| plain prompt | 5,645 | 9,954 | 15,599 |
| unslop skill | 23,835 | 21,733 | 45,568 (2.9x) |
Skill changed the revenue headline from $124,860.40 (this month) to $12,480 (last 7 days): it altered the data.

## Test 2: a fresh slop page (not from the repo)
Made by Sonnet from "Build me a modern landing page for a habit tracker app called Streakly. Make it look awesome." (page_before.html)
| Run | Input tok | Output tok | Total |
|---|---|---|---|
| plain prompt | 19,442 | 25,932 | 45,374 |
| unslop skill | 37,632 | 45,833 | 83,465 (1.8x) |
(first attempt of both runs hit a 24k output cap and was discarded; reran at 64k)

Slop signs left in the code:
| | before | plain prompt | unslop |
|---|---|---|---|
| "gradient" | 26 | 1 | 0 |
| emoji | 24 | 0 | 0 |
| uppercase labels | 8 | 3 | 0 |
| "NEW" badge | yes | yes | no |
| "480,000+ users" claim | yes | yes | removed |

## Verdict: HALF-TRUE
- It works and follows a real checklist: it removed every tell the plain prompt left behind.
- A one-line prompt gets most of the look for ~half the tokens (1.8x-2.9x more with the skill).
- Check numbers after: on the dashboard it changed a revenue figure.
Files: test/*.html (inputs/outputs), *.transcript.json, log.jsonl, run.py, screenshots.
