# Day 5: wheresryan22/anatomy

**Claim:** "Type one line, get a working rocket engine." A Claude skill (23.7K stars, MIT) that draws interactive, explodable technical illustrations as a single HTML file.

## The tests
Headless Claude Code on Sonnet (claude-sonnet-5-5), the skill installed in a fresh project, one prompt each.

| Test | Prompt | Time | Cost | Result |
|---|---|---|---|---|
| `test1-raptor/` | `/anatomy SpaceX Raptor 2 rocket engine igniting on a test stand, interactive` | ~2 min | $0.31 | It copied the repo's shipped `examples/raptor-engine/`; the rocket was not drawn live |
| `test2-watch/` | `/anatomy a mechanical watch, taken apart, interactive` | ~20 min | ~$2.70 (two attempts) | A real exploded watch you can sweep apart, but unfinished when my $3 budget cap stopped it |

Test 2 ran twice: the first attempt ($1.18, 10 min) was cut off by a usage limit, the second (~$1.50, 20 min) was stopped by my own budget guard. `automatic-watch.html` is the file as it stood at that moment, untouched. The `.mjs` / `live.js` files are the agent's build scripts.

Costs are estimated at Sonnet API list prices from the run's token counts.

## What I found
- In Test 1 the skill itself said the closest example was `examples/raptor-engine/` and reused it. That's the rocket in the viral reel: a pre-built example, not a one-line result.
- The skill sizes its own work up front. For both the Raptor and the watch it said "Hero": about 80–150 parts and 2–4 hours.
- The watch is genuinely impressive for one line of text, but nowhere near "seconds".

**Verdict: FACT, with an asterisk.** It really builds these from one line. It doesn't do it in seconds, and the rocket you saw wasn't made live.
