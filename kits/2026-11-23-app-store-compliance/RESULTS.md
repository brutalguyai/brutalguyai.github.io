# mjmirza/app-store-compliance: test results (2026-11-23)
Repo: https://github.com/mjmirza/app-store-compliance @ ad76746 (v2.5.1, committed 2026-11-22). GitHub Trending daily 2026-11-23: +621 stars today, 4,061 total.
What it is: a free, open-source bash "guard" that scans an iOS / Android project for App Store and Google Play rejection causes. No AI, no API key, 0 tokens. Can also be installed as a hook that blocks submit commands in Claude Code, Codex, Cursor etc.
Where it ran: my laptop (Linux VM), by hand, exactly as the README's "Start here" command: bash agent-os/hooks/app-store-compliance-guard.sh "<app folder>".

## Claims tested (quoted from README)
C1 "Catch App Store and Google Play rejection causes before the reviewer does."
C2 "124 documented rejection patterns" (repo description) / "scan the project against rejection-patterns.json"
C3 "Nothing is installed and nothing in your app is changed."
C4 "A small project scans in about a second"
C5 "The guard fires automatically before submission commands such as fastlane, eas submit ... it stops the upload" / "Your AI tool now refuses to help you ship a rejection."
C6 CLEAR means "No critical risk in your code. Not an approval."

## Test target: SplitBill (mini project, not a toy)
Expense splitter for trips/flats, iOS (SwiftUI) + Android (Kotlin): Google login, receipt photo read by OpenAI, Rs 199 Premium (unlimited groups + CSV export), bank-SMS reading to auto-mark UPI settlements.
Trap version = 12 planted, well-known rejection causes (8 Apple, 4 Google Play). Clean version = same app with all 12 fixed. Files: apps/trap, apps/clean. Ground truth: GROUND_TRUTH.md.

## Results: trap app (3 runs, findings identical in all 3; runs/trap_1..3.txt)
| # | Planted trap | Rule | Caught? | Scanner said |
|---|---|---|---|---|
| T1 | Camera used, no NSCameraUsageDescription | Apple 5.1.1 | YES, CRITICAL | ReceiptScanner.swift:10 |
| T2 | UserDefaults used, no PrivacyInfo.xcprivacy | Apple privacy manifest (since May 2024) | YES, CRITICAL | SplitBillApp.swift:16 |
| T3 | Login but no in-app account deletion | Apple 5.1.1(v) | YES, CRITICAL | LoginView.swift:4 |
| T4 | Google is the only login | Apple 4.8 | YES, HIGH | LoginView.swift:2 |
| T5 | Premium (digital) sold via Razorpay link rzp.io, no IAP | Apple 3.1.1 | NO | nothing |
| T6 | Receipt photo to OpenAI, no consent | Apple 5.1.2(i) | YES, MEDIUM ("Third party AI integration detected") | ReceiptScanner.swift:19 |
| T7 | Release build points at https://staging-api.splitbill.dev | Apple 2.1 | NO | nothing |
| T8 | IDFA read, no ATT | Apple 5.1.2 | YES, HIGH | Analytics.swift:7 |
| A1 | targetSdk 34 | Play target API (36 since 31 Aug 2026, per the tool) | YES, CRITICAL | build.gradle:11 |
| A2 | READ_SMS / RECEIVE_SMS, not default SMS app | Play SMS & Call Log policy | YES, CRITICAL | AndroidManifest.xml:5 |
| A3 | No in-app account deletion (Android) | Play account deletion | NO | nothing |
| A4 | Receipt photo to OpenAI, no disclosure (Android) | Play User Data | NO (ANDROID-USER-DATA-DISCLOSURE fired, but on the SMS permission line 5, not the AI upload) | - |
Score: 8 of 12 caught (iOS 6/8, Android 2/4). Verdict line: BLOCKED, 6 critical. Exit code 2.
Extra (non-trap) findings on the trap app: missing privacy policy (true, there was none), export compliance key missing (true), R8 off (true), placeholder (example.com: my fake ad-network URL), deep-link/Universal Links (Google Sign-In URL scheme), haptics, age-rating and 12-tester reminders.

## Why the misses happened (read the scanner source)
- T5: the iOS check is grep 'Stripe|PayPalCheckout|braintree|razorpay' (guard line 1044), case-sensitive. A payment LINK has none of those words.
  Variant var_sdk (Razorpay's real iOS SDK: `import Razorpay`, `RazorpayCheckout`): still NOT caught, 3/3 runs (runs/var_sdk_*.txt).
  Control var_stripe (`import StripePaymentSheet`): CAUGHT, CRITICAL APPLE-3.1.1-EXTERNAL-PAYMENT, 3/3 (runs/var_stripe_*.txt).
  Control var_rzlow (lowercase "razorpay" in the file): CAUGHT 3/3 (runs/var_rzlow_*.txt). => capital-R Razorpay is missed because the match is lowercase-only.
- T7: staging regex is 'staging\.[a-z]' (guard line 912). Variant var_dot with https://staging.splitbill.dev: CAUGHT CRITICAL APPLE-2.1-STAGING-BACKEND, 3/3 (runs/var_dot_*.txt). "staging-api." (hyphen) is missed.
- A3: pattern ANDROID-ACCOUNT-DELETION-URL exists in data/rejection-patterns.json but is not referenced anywhere in the guard script.
- C2: data/rejection-patterns.json has exactly 124 patterns (38 critical, 65 high, 21 medium). 87 of the 124 pattern IDs appear in the guard script; 37 do not (static count, python, this commit). The guard does not read rejection-patterns.json to run checks; its checks are hard-coded.

## Results: clean app (3 runs, identical; runs/clean_1..3.txt)
CLEAR, 0 critical, exit 0. Still printed 3 HIGH + 4 MEDIUM:
- GOOGLE-MISSING-PRIVACY-POLICY (HIGH): wrong, SettingsActivity.kt links https://splitbill.app/privacy.
- BOTH-SECURE-STORAGE (HIGH) at LoginView.swift:14: wrong, the line is the Apple credential object; UserDefaults only holds a user ID (rule matches the word "credential").
- BOTH-UNSAFE-DEEPLINK (HIGH): the only URL scheme is the one Google Sign-In requires.
- APPLE-5.1.2-AI-NO-CONSENT-MODAL (MEDIUM): still printed although a consent alert naming OpenAI is shown before upload (it is worded as a reminder "If personal data is sent...").
- haptics, age-rating, 12-tester reminders (MEDIUM).

## Other claims
- C3 nothing changed: sha256 of every trap-app file before vs after 3 runs: identical (runs/trap.sha_before; FILES_UNCHANGED).
- C4 speed: 4.0 s, 3.1 s, 2.9 s wall time on the laptop VM for the 20-file app; guard printed "Scan time. 3s/4s". Not "about a second" on this machine, but seconds.
- C5 hook mode (Claude Code PreToolUse JSON on stdin): trap app + "fastlane ios release" exit 2 (block), "eas submit -p ios" exit 2, "git status" exit 0 (silent). Clean app: all exit 0. (runs/hook_*.txt). Exit 2 is Claude Code's block signal. Not tested inside a live Claude Code session.
- Determinism: findings identical across all 3 runs of every variant (only "Scan time" differs).
- Cost: free, MIT-style licence (ORA 2.3), 0 tokens.

## Not tested
- Real App Store / Play review (no submission). The "approved first try" Reddit story is the author's anecdote, not tested.
- Flutter / React Native / Expo, monitors, install.sh, the /app-store-audit AI prompt.

## Verdict: LEGIT*
Free, 3-second, read-only scan that caught 8 of 12 real rejection causes with file and line, and a working submit-blocking hook. README is honest ("does not guarantee approval").
* Missed 4 of 12, including Premium sold through Razorpay (both a payment link and Razorpay's own SDK, because of a lowercase-only match) and a hyphenated staging URL; Android account deletion is in the 124 but never checked; 37 of 124 patterns are not in the scanner. CLEAR is not "safe": the clean app also got 3 wrong HIGH warnings.
