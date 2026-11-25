# RESULTS — mvanhorn/last30days-skill (v4.6.0, commit 7c2e1c2b)
Tested Nov 25 2026 on Swapnil's laptop (Windows, home connection in India), keyless exactly as the README's "Zero config" line. No accounts, keys or logins. 10 research runs + 1 doctor probe. Raw: work/outputs (round 1, engine's own planner) and work/outputs2 (round 2, agent-style --plan like Claude Code writes, Reddit health cache cleared before each run).

## Claim under test (README)
- "Zero config. Reddit, HN, Polymarket, and GitHub work immediately"
- "Reddit ... Top comments with real upvote counts, free, no API key."
- "searches all of it in parallel, scores it by what real people actually engage with" (Reddit, X, YouTube, TikTok, HN, Polymarket ...)

## What the README says each source needs (full README read, Setup table)
- "Reddit (with comments) + HN + Polymarket + GitHub + StockTwits + company patent filings and careers pages | Nothing | Free"
- TikTok + Instagram + Threads + Pinterest + LinkedIn: ScrapeCreators key (10,000 free calls); without it, best-effort TikTok/Instagram via yt-dlp, "fewer results".
- X: X_BEARER_TOKEN or other setup. YouTube: yt-dlp (was already installed, doctor: 2026.03.17).
- So the fair zero-setup claim is ONLY Reddit, HN, Polymarket, GitHub. TikTok/Instagram/X zeros are NOT held against it in the video.
- Not run: the first-run setup wizard inside Claude Code (it unlocks the optional sources, not Reddit).

## Results
| Source | Runs with results | Evidence |
|---|---|---|
| Reddit | 0 of 10 | every run: RedditSearch "HTTP 403: Blocked"; web fallback 0 threads (brave/ddg/startpage throttled). *.err.txt |
| Hacker News | 8 of 10 (0 for Kling AI x3) | results JSON |
| YouTube | 10 of 10 | results JSON |
| Polymarket | 3 of 5 planned runs returned markets (Claude Code 5, Cursor 1-12 per log); not queried in round 1; doctor probe: connection forcibly closed | outputs2 status + err |
| GitHub | 3 of 5 round-1 runs; then rate-limited / SSL error (unauthenticated tier) | outputs/*.err.txt, postmortem.json |
| TikTok, Instagram | 0 of 10 (status "error") | source_status |
| X | not available without setup (doctor: unconfigured) | doctor.json |

- Reddit direct check from the same network (outputs2/reddit_direct.csv): reddit.com search.json 403, r/ClaudeAI top.json 403, old.reddit.com HTML page 200. So Reddit blocks plain script requests from this connection; the browser page works. Scope: "on my connection". README offers a logged-in Reddit mode (not tested: needs login).
- Numbers are real: HN "Goldman Sachs is pulling Claude Code..." tool 905 pts / 497 comments = live HN API 905 / 497. HN "1994 Jeep's ECU" tool 458 / 244 = live 458 / 244. (Checked via hn.algolia API Nov 25.)
- Window slip (round 1, no plan): "Cursor" returned "Cursor Tutorial for Beginners" published Oct 17 2024 (confirmed on YouTube) and one from Mar 7 2025; 3 of 11 HN hits were about the mouse cursor. Round 2 with the plan: all items Oct 26-Nov 25 2026; 1 of 14 HN still about a text cursor ("Nook ... where the cursor never moves").
- Thin on a creator topic: "Kling AI" round 1 = 2 YouTube videos (1,011 and 6 views). With plan, 2 of 2 runs = 8 YouTube videos only, 0 HN, 0 Reddit, 0 Polymarket; 4 of 8 under 25 views; 1 off-topic ("Fable 5.2 Is AGI").
- Strong case: "Claude Code" with plan = 32 items (12 YouTube, 15 HN, 5 Polymarket), all inside the window.
- Run time: 84-178 s per run (timings.csv).

## Verdict: HALF-TRUE
Real data with real, exact numbers, and good on dev topics (Claude Code). But on my connection Reddit, which the README says needs nothing, returned 0 posts in 10 of 10 runs; GitHub was rate-limited or failed in 2 of 5 round-1 runs; Polymarket returned markets in 3 of 5 planned runs. TikTok/Instagram/X need a key per the README, so they are not counted against it. For a creator topic (Kling AI) it was YouTube-only.
Video wording rules: "on my connection", "in my 10 runs". Never "Reddit never works".
