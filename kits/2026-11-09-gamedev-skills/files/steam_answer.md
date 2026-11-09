# Reply to "publish this on Steam" (run A, plugin installed, no skill loaded)

I can't publish this to Steam from here, and some of the steps have to be done by you.

**What only you can do**
- Register a Steamworks partner account. That involves identity and tax details and a one-time $100 fee per app.
- Create the app and fill in the store page: capsule art, screenshots, description and pricing.
- Pass Valve's review of the store page and of the build. Review takes a few days.
- Upload the build with `steamcmd` and your Steamworks login, then press the release button.

I won't handle your Steam credentials or release anything to the public for you.

**What I can do to get it ready**
1. **Wrap it as a desktop app.** Steam doesn't take a browser game as it is. I'd package it with Electron or NW.js for Windows and Linux, which can't be run in this environment, so I'd write the config and you'd run the build.
2. **Bundle Phaser locally.** The game currently loads Phaser from a CDN, so it won't run offline. A Steam build needs the library included in the folder. I can't download it here without network access, so you'd copy the file in.
3. **Add the basics Steam players expect.** That means a title screen, a fullscreen toggle, a pause and quit key, and sound. The game has none of these yet.
4. **Write the Steamworks files.** I'd draft the depot and app build scripts for `steamcmd`, plus a store-page checklist and text.

The game is also very small: two levels and no sound. Steam can take it, but you might get more from an itch.io release first.

Should I start with the Electron wrapper and the local Phaser bundle, or the store-page checklist?
