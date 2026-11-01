# Day 3: cloudflare/security-audit-skill

**Question:** does Cloudflare's security-audit skill find more real bugs than plain Claude Code?

## The test
- `ledgerly-test-app/`: a small invoicing API (Express + SQLite, 11 files) written for this test. **It is deliberately insecure. Don't deploy it.**
- [ANSWER_KEY.md](ANSWER_KEY.md): the 8 planted vulnerabilities and 4 traps (code that looks risky but is safe). The agents never saw this file.
- Both runs got the same codebase and a one-line prompt (see the top of each TRANSCRIPT.md).

## Results
| | Plain Claude Code | security-audit skill |
|---|---|---|
| Planted bugs found | 8/8 | 8/8 (7 confirmed, SSRF left as "needs validation") |
| Traps wrongly flagged | 0 | 0 |
| Extra real bug | none (called the git endpoint "the correct pattern") | `ALLOWED_GIT[req.query.what]` accepts `constructor`/`__proto__` → request hangs or errors (admin-only, low risk) |
| Time | 2 min 21 s | about 33 min, split by a usage-limit pause |
| Cost (Claude Code's reported API-price cost) | $0.70 | $8.86 + $25.90 = $34.76 |

The skill only runs target code inside an OS-enforced sandbox. This environment couldn't provide one, so it confirmed findings by reading code and running small isolated scripts, not by attacking a live server.

## Folders
- `plain/`: REPORT.md and TRANSCRIPT.md for the plain run.
- `skill/`: the skill's REPORT.md, FINDINGS-DETAIL.md, NEEDS-VALIDATION.md, findings.json, architecture.md, run-metadata.json and TRANSCRIPT.md.

## Rerun it
    cd ledgerly-test-app && git init && git add -A && git commit -m init
    npx skills add https://github.com/cloudflare/security-audit-skill --skill security-audit
    claude "Run a full security audit of this codebase using the security-audit skill. Output directory: ../audit"
