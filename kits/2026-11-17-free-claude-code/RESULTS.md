# RESULTS: "Free Claude Code / 9 billion free tokens a month" (OmniRoute hands-on), run Nov 17 2026
Everything below is from files in this folder (out/). Router: omniroute v3.8.53 from npm (`npm install -g omniroute`: 1,329 packages, 3.4 GB on disk, 2 min). Ran on a Linux cloud machine (Node 22). Claude Code 2.1.326.
Keys: My own free Groq key and Google AI Studio key (read from .env via --credential-env; never printed). My Anthropic key was used ONLY for the Sonnet baseline and was never given to the router.
NOT tested: FreeLLMAPI (the "7.4B" half of the 9B claim), paid tiers, long sessions, the dashboard UI, token-compression claims, any provider other than Groq + Gemini.

## 1. Fresh install, zero signups (out/01_fresh_install.txt)
- `omniroute providers list` -> "No providers configured."
- `omniroute chat "Reply with the single word: hello"` -> 502 Bad Gateway, 3 of 3 tries. The router tried keyless providers and all failed: Cloudflare Playground 503 ("needs Playwright and its Chromium browser"), uncloseai 401 ("The public beta is closed for now ... key registration is closed"). Diagnostics on try 1: poolSize 21, attempted 2.
- Caveat: Playwright/Chromium was not installed for the router; with it, Cloudflare Playground might work. Say "out of the box" on screen, not "never".

## 2. After adding two free keys (out/02_add_providers.txt, out/03_after_keys.txt)
- Both connections added and "provider test passed".
- "Which model are you?" x3 via `omniroute chat`: answered by openai/gpt-oss-120b (said "I'm ChatGPT"), openai/gpt-oss-120b, then allam-2-7b. Three requests, two different models, none of them Claude.

## 3. Claude Code through the router vs Sonnet (same task, same prompt, same flags)
Task: task_template/ (3 files, 1 planted bug in pricing.py, 2 of 4 tests failing). Prompt: "The tests in this folder fail. Find and fix the bug so that `python3 -m pytest -q` passes. Do not edit the test file." Cap: 280 s per run.
- First attempt with Claude Code's default model: `omniroute launch` failed in 4 s: "API Error: 400 Ambiguous model 'claude-opus-5-5'. Use provider/model prefix" (out/free_run0_default_model_error.jsonl). Needed `--model auto` to get further. (The default model here came from this machine's Claude Code config; another machine may differ.)

| Run | Model(s) that answered | Bug fixed (4/4 tests) | Wall time | Session finished? |
|---|---|---|---|---|
| free 1 | gemini-3.1-flash-lite | yes | 280 s (hit cap) | no: fixed it, then tried an unasked `git commit`, was denied, never returned |
| free 2 | gemini-3-flash-preview, gemini-3.1-flash-lite | yes | 280 s (hit cap) | no: 224 s gap between reading the file and the edit |
| free 3 | gemini-3.1-flash-lite | yes | 211 s | yes (also wrote an unasked MEMORY.md into the project) |
| Sonnet 1 | claude-sonnet-5-5 (apiKeySource ANTHROPIC_API_KEY) | yes | 10.8 s | yes |
| Sonnet 2 | claude-sonnet-5-5 | yes | 9.0 s | yes |
| Sonnet 3 | claude-sonnet-5-5 | yes | 8.2 s | yes |

What differed besides the model: nothing in task, prompt, flags or machine. The free runs went through the local router; Sonnet went straight to Anthropic. Free run 1 has no per-message timestamps (added from run 2).

## 4. Why it was slow: the router's own request log (out/usage_logs.json, 157 entries, whole session)
Upstream calls to the two providers my keys cover:
- Gemini: 25 OK (200, 2 of them the connection test); 16 x 503, 5 x 504, 6 x 429 (rate limit), 3 x 404, 9 other/aborted.
- Groq: 5 OK (200); 11 x 413 (request too large for the free tier: Claude Code's prompt is big), 4 x 400, 3 x 404.
- So 30 successful calls against 48 failed ones with a 4xx/5xx status (plus aborted ones), and the router returned 502 to the client 9 times.
- `omniroute usage quota` at the end still showed both providers "available", remaining 100.

## 5. The "billions of tokens" number (README only, not measured)
OmniRoute's README (read Nov 17): "~1.62B tokens / month" is an estimate of third-party free tiers the user is separately eligible for, "not a grant from OmniRoute"; you bring your own accounts. We used a tiny fraction of that and did not test how much is really reachable.

## Lines the script may use (each maps to a section above)
- "Fresh install, no signup: 502, three times out of three." (1)
- "With two free keys it works, but Claude never answered: I got GPT-OSS, a 7B model, and Gemini Flash Lite." (2, 3)
- "Same bug, same prompt: Sonnet 8 to 11 seconds; the free route 211 seconds, and twice it didn't finish in 280." (3)
- "It did fix the bug all three times." (3)
- "The router's log: 30 calls went through, 48 came back as errors: too large, rate limited, unavailable." (4)
Verdict is the scriptwriter/judge's call from these; suggested by the evidence: HALF-TRUE (free: yes; works: yes on a tiny task; "Claude" and "unlimited": not in my test).
