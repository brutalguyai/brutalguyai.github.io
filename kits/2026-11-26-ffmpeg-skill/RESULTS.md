# RESULTS — kajisho5/ffmpeg-skill (v4.8.2, commit 57307146)
Tested Nov 26 2026 on Swapnil's Windows laptop (local FFmpeg). Agent: Claude Sonnet 5.5 on his API key, harness fx_harness.py (Claude Code-style: run PowerShell / read file incl. images / write file). 3 runs WITH the skill (listed like an installed Claude Code skill), 3 runs WITHOUT (plain FFmpeg), alternating. Same prompt = the README's own example:
"Take interview.mp4, keep 0:45–1:20 and 5:00–5:25, and make it a 60-second Reel."
Footage: NASA public-domain in-flight interview (Victor Glover, ISS, 2021-02-04), first 400 s, 1280x720 59.94 fps, source loudness -20.4 LUFS, peak +0.3 dBFS.
Measured by me (measure.py): ffprobe, EBU R128 (ebur128), audio-fingerprint map of every output second back to the source.

| Run | Final file | Length | Size | Segments (audio map) | Loudness | Peak | Framing | Tokens | Time |
|---|---|---|---|---|---|---|---|---|---|
| plain 1 | reel.mp4 | 60.00 s | 1080x1920 30fps | 45-80 + 300-325 ✓ | -20.5 LUFS | +0.3 dBFS | blurred fill | 12,916 | 103 s |
| plain 2 | reel.mp4 | 60.00 s | 1080x1920 30fps | ✓ | -20.5 | +0.3 | centre crop | 57,702 | 227 s |
| plain 3 | reel.mp4 | 60.00 s | 1080x1920 30fps | ✓ | -20.5 | +0.7 | blurred fill | 12,951 | 106 s |
| skill 1 | interview_reel.mp4 | 60.01 s | 1080x1920 30fps | ✓ | -14.2 | -0.9 | blurred fill | 145,007 | 520 s |
| skill 2 | cut60_reels.mp4 | 60.01 s | 1080x1920 30fps | ✓ | -14.0 | -1.0 | centre crop | 90,135 | 546 s |
| skill 3 | interview_reel.mp4 | 60.01 s | 1080x1920 30fps | ✓ | -14.0 | -1.0 | black bars (pad), video fills ~1/3 | 82,029 | 423 s |

## What held up
- The skill did what the README shows: 3/3 read SKILL.md, used its tools (render.py project / cut.py + render.py --template reels), ran check.py and/or look.py and viewed the contact sheet before reporting. 3/3 correct 60 s 9:16 Reels.
- Loudness: skill 3/3 at -14.0 to -14.2 LUFS, true peak -0.9/-1.0 dBTP (Reels preset). Plain 3/3 left it at the source's -20.5 LUFS (6.5 LU quieter) with peaks over 0 dBFS (+0.3/+0.7). None of the plain runs touched loudness.
- No cloud, no API keys for the tools: all edits ran with local ffmpeg + Python stdlib.

## What didn't
- README's "why": "An agent that knows FFmpeg still guesses ... reports done without opening the result." In my test plain Claude got the cuts, length and 9:16 size right 3/3 and looked at a frame of its result 3/3 (plain 2 viewed 4 images). The real difference was loudness + formal spec checks, not the cut.
- Cost: skill runs used 82K-145K tokens (avg 105.7K) vs plain 13K-58K (avg 27.9K) = 3.8x; avg 496 s vs 145 s = 3.4x slower. (Harness has no prompt caching; tokens = all input+output processed.)
- Framing is not decided by the skill (README says the agent chooses): README example uses --fit crop; skill runs gave blur, crop and pad. Skill 3 shipped black bars with the video filling about a third of the screen (the agent noted it in its report but still delivered it).

## Verdict: LEGIT*
Works as described and fixes the one thing plain Claude skipped (Reels loudness, -14 LUFS / -1 dBTP, 3/3). Catches: ~3.8x tokens and ~3.4x the time for this job; plain Claude already cut it right; framing still on you (1 of 3 skill runs = black bars).
Wording rules: "in my 6 runs", "in my test". Never "always".
