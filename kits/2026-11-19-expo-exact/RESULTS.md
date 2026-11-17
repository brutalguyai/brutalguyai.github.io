# RESULTS — expo/exact (tested 17-18 Nov 2026)
Repo: https://github.com/expo/exact (4.6K stars, 121 forks, created 2 Nov 2026, MIT, pre-1.0). Commit tested: 65a19452 (17 Nov 2026).
Claim (repo About + README line 3): "Write an app once. Exact runs it natively on the web, macOS, iOS and Linux ... and a coding agent can build, run, see and test it on each of them."
Other README claims checked: "The page rebuilds and reloads in about a tenth of a second" (edit to page, 99 ms on a fresh app); budget "100 ms p50" cold start.
Expo context: Expo is a React Native framework + cloud platform; expo.dev says it is used by 81% of React Native devs and is the framework the React Native core team recommends.

## Setup (me, before the agent)
- Cloud Linux box, 2 CPU cores, no GPU, no Xcode. Bun 1.4.2 (pinned), Rust via rustup.
- `bun scripts/exact.mjs setup` ran once. One sandbox-only issue: our network proxy's certificate wasn't trusted by the Hermes installer's built-in TLS, so I served the same pinned Hermes file from a local mirror (HERMES_LEAN_SYS_MIRROR). Not Exact's fault.
- Disk after setup: checkout ~1.8 GB + its build folder 5.3 GB + pinned Rust toolchains 1.85 GB (stable 1.99.1 + nightly) + Cargo crates 0.92 GB + ~/.cache/exact 0.57 GB + Hermes 0.11 GB ≈ 10.5 GB. Each new app's own build folder: 5-6 GB (todo: 5.8 GB, todo2: 5.1 GB). Setup + one app ≈ 16 GB.

## Agent test (3 fresh runs)
Prompt = README's own "Or ask a coding agent" prompt, adapted: web + Linux instead of macOS + iOS (no Mac here), checkout pre-cloned, setup already done (README's own timing also had caches warm).
Claude Code (headless), Sonnet 5.5, max 200 turns, permission mode acceptEdits, no human input.
| run | result | turns | time | app size (app.contract + app.ts) | test on web | test on Linux |
|---|---|---|---|---|---|---|
| 1 | success | 21 | 29.8 min | 41 + 26 = 67 lines | pass | pass |
| 2 | success | 22 | 31.7 min | 43 + 27 = 70 lines | pass | pass |
| 3 | success | 18 | 21.0 min | 68 lines | pass | pass |
- I re-ran every app's test myself on both hosts afterwards: 3/3 pass on web, 3/3 pass on Linux.
- First Linux build (compile) inside the runs: 14m16s, 13m40s; a rebuild 4m55s / 5m07s. A big share of each run was waiting for the compiler.
- Friction seen: Linux isn't in a new app's manifest; the agent had to add "linux" to app.json host + deploy.store after a "requires the delivery adapter" error. The agent also wasted minutes in self-matching `pgrep` wait loops (an agent mistake, not Exact's).
- Footage: web = real headless Chrome screenshots of run 1's app being used; Linux = Exact's own Linux host screenshots via `bun exact.mjs agent linux` (headless, painted by Exact, no browser).

## Edit speed
Dev loop (`bun exact.mjs web`), 6 edits to a button label in app.contract, measured by Exact's own log and by a browser watcher:
edit -> first frame in the DOM: 2352, 2174, 2532, 1952 ms (log); browser watcher 2005-2590 ms. Rebuild alone ~1.8-2.3 s. Page runtime up 99-156 ms after its script (close to the 100 ms cold-start budget).
=> about 2 s on a 2-core cloud box vs README's 0.1 s on an Apple Silicon Mac. Hardware differs a lot; on screen: "on my small cloud machine".

## Not tested
macOS and iOS (need a Mac + Xcode), Android/Windows (early), bundle-size claims (26 KB vs React 81 KB on RealWorld).

## Verdict: LEGIT (for web + Linux)
One code, two platforms, built and tested by an AI alone, 3 of 3. Catches: Mac/iPhone untested here, ~16 GB disk, 14-minute first native build, pre-1.0 ("changes daily, no API stability"), edits ~2 s on a small machine.
