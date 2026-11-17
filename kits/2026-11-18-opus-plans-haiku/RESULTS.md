# RESULTS — "Opus plans, Haiku does the work at a fortieth of the price"
Claim source: @murphmaxxing, instagram.com/p/Dff39V1vpj7 (113K likes when picked)

## Setup
- Task: one small Python feature (ledger: monthly summary, duplicate finder, CLI report). TASK.md + 12 hidden tests the agent never saw.
- Claude Code 2.1.326, headless (`claude -p`), same prompt every run, max 60 turns, 10 min timeout. API list prices.
- 3 setups x 3 runs:
  - opus  = Opus 5.5 alone
  - omega = Opus 5.5 main agent with CLAUDE.md "plan + delegate, don't implement" and 4 subagents (researcher/builder/tester/reviewer) pinned to `model: haiku` — the viral setup
  - haiku = Haiku 5.5 alone

## Raw
| run | cost $ | Opus share | tokens | secs | hidden tests |
|---|---|---|---|---|---|
| opus_1 | 0.2311 | 100% | 224,380 | 61.2 | 12/12 |
| opus_2 | 0.2232 | 100% | 247,326 | 53.6 | 12/12 |
| opus_3 | 0.1868 | 100% | 197,064 | 45.3 | 12/12 |
| omega_1 | 0.2107 | 91.6% | 494,330 | 95.1 | 12/12 |
| omega_2 | 0.2394 | 90.6% | 641,146 | 123.0 | 12/12 |
| omega_3 | 0.2814 | 92.1% | 830,658 | 151.1 | 12/12 |
| haiku_1 | 0.0113 | 0% | 421,221 | 49.5 | 12/12 |
| haiku_2 | 0.0072 | 0% | 215,469 | 31.0 | 12/12 |
| haiku_3 | 0.0078 | 0% | 247,208 | 32.4 | 12/12 |

## Averages
| setup | avg cost | avg time | pass |
|---|---|---|---|
| Opus alone | $0.2137 (~21¢) | 53.4 s | 12/12 x3 |
| Opus plans + Haiku works | $0.2438 (~24¢, +14%) | 123.1 s (2.3x slower) | 12/12 x3 |
| Haiku alone | $0.0088 (~1¢, ~1/24 of Opus) | 37.6 s | 12/12 x3 |

## Claim counter
1. Haiku is 1/40 the price of Opus per token — TRUE ($4 vs $0.10 input, $20 vs $0.50 output; Haiku price valid for prompts ≤100K tokens).
2. So "Opus plans, Haiku works" costs 1/40 — NOT in this test. It cost 14% MORE than Opus alone; Opus was still >90% of the bill (planning, reading reports, checking work), and total tokens roughly tripled.
3. Haiku can do the work — YES, here: Haiku alone passed all 12 hidden tests every run.

VERDICT: OVERHYPED.

## Fine print (goes on screen)
One small Python feature, 12 hidden tests, 3 runs each. API list prices. Bigger, longer projects may differ (Opus context grows, delegation could pay off). Auto-compaction and prompt-caching tuning not tested.

## Sources
- Anthropic pricing page (models & pricing, docs.claude.com) — checked 17 Nov 2026
- Claude Code subagents docs (`model:` field in .claude/agents/*.md)
- Raw logs: test/out/*.jsonl (modelUsage per run), cost recomputed by test/cost.py = Claude Code's own costUSD
