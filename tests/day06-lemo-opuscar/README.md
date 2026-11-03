# Day 6: lemomo-ai/lemo-opuscar

**Claim:** "One sentence → a whole short film, made entirely in code, no video model." A Claude Code toolbox of 66 film styles (11.7K stars, MIT), tested at commit `bebbbe1`.

## The test
Headless Claude Code on Sonnet (claude-sonnet-5-5), not the Opus 5.5 the styles are tuned for. Budget cap $3, Nov 2 2026.

Brief (`run1/prompt.txt`): *"Make a 20-second film in the swiss-motion style about how a cup of coffee travels from the farm to your cup. Warm male narrator."* Non-interactive, no storyboard.

| Run | Time | Cost | What happened |
|---|---|---|---|
| `run1/` | 1.7 min | $0.56 | Wrote the treatment and script, installed deps, then stopped: my permission allowlist didn't cover the repo's own `.venv/bin/python` (my runner's fault, not the repo's) |
| `run2/` | 5.2 min | $1.05 | Fresh session continuing from run 1's files: voice (Kokoro), the page, music, foley, mix, render |
| **Total** | **~7 min** | **$1.61** | A finished film: 20.0 s, 1920×1080, 24 fps, narration, original score, sound effects, −14.1 LUFS |

Costs are at Sonnet API list prices from each run's own cost report.

## Files
- `run1/`, `run2/`: the prompt and the full terminal transcript of each run
- `film/`: the film's source as the agent wrote it (`index.html`, `main.js`, `mix.py`, `lines.json`), its subtitles and a contact sheet of frames
- `runner/`: my test runner (budget cap + watchdog)

## Caveats
- The README says a film takes 30–60 minutes and a fair amount of tokens; that's for its Opus films. A short one on Sonnet was far quicker and cheaper.
- The speech check (Whisper) couldn't run: the test machine can't download the model, so the voice lines weren't machine-checked.
- Needs ffmpeg 7+ (Ubuntu's 6.1 is too old); I supplied 7.0.2.
- Runs count against your Claude plan: my 7-day limit warning showed 50% during run 2.

**Verdict: FACT, with an asterisk.** Real films, really made in code. Start short.
