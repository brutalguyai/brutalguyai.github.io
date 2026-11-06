# Day 7: vercel-labs/agent-desktop (v1.2.0), tested Nov 6 2026

Claim: "computer use without screenshots or pixel matching" (accessibility tree -> JSON refs).
Setup: Ubuntu 24.04 container, Xvfb 1440x900, xfwm4, Mousepad text editor, at-spi2. Model: Claude Sonnet (claude-sonnet-5-5) via direct API.
Task (same for all runs): type "Brutal guy was here" into Mousepad and save it via the app's Save dialog.

## Size of one "look" at the app (Mousepad window 1280x800, tiktoken cl100k approx)
| What | Size | ~Tokens |
|---|---|---|
| snapshot -i (what the skill says to use for small apps) | 45.9 KB, 271 refs | ~13,000 |
| snapshot -i --compact | 46.4 KB | ~12,500 |
| snapshot -i --skeleton | 14.6 KB, 79 refs | ~3,900 |
| find --role menuitem --name Save | tiny | ~230 |
| screenshot of the same window (1290x834) | image | ~1,430 |

## Agent runs (all three saved the file correctly)
| Run | How | Turns | Input tokens | Output tokens | Time |
|---|---|---|---|---|---|
| A | agent-desktop + official skill, default behaviour | 9 | 282,010 | 733 | 19.9 s |
| B | plain screenshots + xdotool clicks/typing | 7 | 43,003 | 471 | 21.4 s |
| C | agent-desktop "lean" (find only, no full snapshots) | 10 | 47,338 | 771 | 17.2 s |

Why A is so big: following its own skill, the agent loaded the 17.6 KB Linux platform skill, then took a 46 KB snapshot; every later turn re-sends it.
Real advantages seen: actions are headless (A and C never moved the mouse or took focus); exact element targeting, no pixel guessing.

## Verdict: HALF-TRUE
- "Without screenshots": TRUE.
- Implied "cheaper/lighter than screenshots": NOT by default (6.5x more tokens in run A). Only on par when used lean (C vs B).
- Worth it for: background automation that must not steal your mouse/keyboard, and precise clicks.
Files here: `run.py` + `reset.sh` (my test harness), `runs/` (full transcript of each run), `snapshots/` (what the AI actually receives: full snapshot, skeleton, a `find` result, and the screenshot). Screen recordings are shown in the video.
