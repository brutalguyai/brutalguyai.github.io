# Agent Reach (Panniantong/Agent-Reach v1.6.1): test results, 2026-11-26

Test machine: Swapnil's Windows laptop. Installed with `uv tool install` from the official GitHub release zip. No logins, no API keys, no cookies.
Agent runs used claude-sonnet-5-5 through the Claude-Code-style harness (ar_harness.py), with the same model on both sides.
- **skill:** the agent-reach SKILL.md is listed as an available skill and the CLI is on PATH.
- **plain:** no skill, and the agent-reach entries are removed from PATH.

There were 5 tasks, each run 3 times per mode, for 30 runs in total.

## A. Direct CLI (3 runs each, no login)
| command | result | time |
|---|---|---|
| web read / web search | ok 3/3 | 1–6 s / ~1.4 s |
| youtube read / subtitle / search | ok 3/3 | ~6 s / ~8.7 s / ~2.3 s |
| v2ex hot | ok 3/3 | 1 s |
| bilibili hot / search | ok 3/3 | ~2.5 s |
| reddit search (public-web) | ok 3/3, real r/ClaudeAI posts, but newest Oct 13 2026 | 1.2 s |
| github read / search | FAIL 3/3: `NEED_SETUP: gh is not installed`; github-api fallback `UPSTREAM_BROKEN` (paused) | 0.6 s |
| twitter search (no login) | FAIL 3/3. Run 1 hung **753 s (12.5 min)**, then `NEED_SETUP: waiting for the OpenCLI extension… click 'Add to Chrome'` | |

## B. Agent with skill vs without (correct answers out of 3)
| task | plain (no Agent Reach) | with Agent Reach |
|---|---|---|
| YouTube: summarise a 3Blue1Brown video from its spoken content | **3/3**. yt-dlp, English captions, accurate summary | **0/3**. The tool asked for **zh-Hans** subtitles and got HTTP 429. It then paused the YouTube channel for ~51–57 min and the agent stopped |
| V2EX: top 5 hot topics | 3/3 | 3/3. Identical list in both modes |
| GitHub: stars + latest release | **3/3**. GitHub API, ~4.7 s, ~2.2k tokens | 2/3. The github channel hit an SSL cert error. The web fallback worked in 2 runs, ~25 s, ~40k tokens |
| Reddit: 3 posts from the past week | 0/3. Reddit returned 403/429 to scripts | 0/3. The browser route failed (`Port 9222 belongs to an unmanaged browser`). The public-web index had nothing newer than Oct 31 |
| Web: 3 key points of Anthropic "Building effective agents" | 3/3 | 3/3 |
| **TOTAL** | **9/15** | **8/15** |

- Avg tokens per run: plain 11.7k, skill 33.0k (**2.8x**). Avg time: plain 19.7 s, skill 29.1 s.
- Made-up answers: **0 of 30** in both modes. Every failure was reported honestly.
- **Language side-effect:** the SKILL.md is written in Chinese, and **11 of the 15 skill runs answered in Chinese** even though the prompt was in English. In plain mode only 2 of 15 runs did, both V2EX, where the topic titles are themselves Chinese.

## C. Independent checks
- GitHub: the plain runs queried api.github.com directly and got 114,992–114,995 stars and release v1.6.1 (2026-11-01). The repo page fetched from the cloud showed "114.0k stars", "10.2k forks" and the MIT license; that page was probably cached. Say "about 115k stars", read off the repo page.
- V2EX: the same 5 topic IDs (1259982, 1259867, 1260059, 1259889, 1259974) came back from the official `/api/topics/hot.json` in plain mode and from `agent-reach v2ex hot`.
- YouTube: plain transcripts match the real video. It opens with "This is a 3. It's sloppily written… 28x28 pixels".

## D. Caveats (say these in the video)
- The CLI test hit YouTube 9 times (read, subtitle, search x3) shortly before the agent runs, which may have contributed to the 429. Still, a plain yt-dlp request for the English track worked seconds later, so the ~1-hour self-lockout is the tool's own choice.
- Port 9222 was held by another browser debug session on this laptop. That is a setup clash, not proof that Reddit "needs login".
- The GitHub SSL error is machine/network specific. The README says GitHub needs "Nothing", but on this clean machine it needed `gh` installed.
- We did not test login channels (Xiaohongshu, Instagram, X with cookies, LinkedIn). They need the user's own accounts, which we do not do.

## Verdict: HALF-TRUE
- **True:** you install it with one command, it needs no API keys for web, YouTube, V2EX and Bilibili, the CLI is fast and gives clean JSON, it is read-only, and it never fabricated anything.
- **Hype:** it did not make the agent better. The agent scored 8/15 with it against 9/15 without, and used 2.8x the tokens. The tagline promises "the entire internet" and names Twitter and Reddit, but the README's own table says Reddit, Twitter, Xiaohongshu, Instagram, Facebook and Boss need a login. Twitter also hung for 12.5 min before asking for a Chrome extension. The YouTube default is Chinese subtitles, and the Chinese skill file switches the agent's language.
- **README honesty:** the README itself warns that the PyPI package named `agent-reach` is NOT this project, and that the project has no official token or coin and does not run any Solana/Pump.fun project.
- **Best fit:** agents that need Chinese platforms (Bilibili, V2EX, Xiaohongshu), or agents that have no shell or web tools of their own.
