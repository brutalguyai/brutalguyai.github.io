# RESULTS: cathrynlavery/diagram-design (Nov 22 2026)

Repo pinned at commit d7b0176 (Nov 22 2026). On GitHub Trending today: +583 stars, 70.0k total.

## Setup
- Model: claude-sonnet-5-5 on Swapnil's API key, run from the laptop with harness/dd_harness.py. The harness is a direct-API emulation of how Claude Code exposes a skill, NOT Claude Code itself: in skill mode the system prompt lists diagram-design (its own frontmatter description plus the SKILL.md path), and the model decides on its own whether to read it.
- Plain mode: identical prompt, tools, model and limits, but no skill listed. That is the ONLY difference between the two modes.
- Tools in both modes: list_dir, read_file, write_file, run_python, fetch_url. No Playwright on the laptop, so the skill skipped its own render-and-look step and said so.
- First-run gate: in all 4 skill runs, the skill stopped before drawing to ask about brand/style. The harness auto-replied once: "Proceed with the default style."
- Prompts (mini projects, not toys): p1 architecture of an expense-splitting app (Google sign-in, Postgres, S3 receipts, OCR worker via queue, email). p2 sequence of a UPI salon-booking payment via Razorpay, including a duplicate webhook. p3 data model for a link-in-bio site with analytics.
- Runs: skill-arch-1, skill-seq-1, skill-er-1, skill-er-2 | plain-arch-1, plain-seq-1, plain-er-1, plain-er-2. Token cap forced 1 skill run per prompt (2 for ER).

## Claim checks (verified by file)
| Claim (README / About) | Result | Evidence |
|---|---|---|
| "51 diagram types" (README) / "45" (About line) | 51 type references in skills/diagram-design/references (type-*.md). The About line's "45" is out of date. | `ls references/type-*.md` = 51 |
| One self-contained HTML + inline SVG, no JS, no build step | TRUE in 4/4 skill outputs: one .html each, no `<script>`. The only network request is Google Fonts, which the README itself discloses (system fonts make it fully offline). | render/ checks; all 242 gallery files also load fonts.googleapis.com |
| "No shadows" | TRUE in 4/4 outputs (no box-shadow, drop-shadow or feDropShadow) | grep |
| Structural geometry on a 4px grid | TRUE: 54 of 54 node boxes (rects >= 60x40) in the 4 outputs have x, y, width and height divisible by 4. Small marks (legend swatches, masks) are off-grid, which layout-budget.md allows. | node-grid script |
| Checks for overlaps and clipping | The skill ran its own self_check.py + verify_geometry.py in 4/4 runs; I re-ran both independently: 0 findings in 4/4. | transcripts + re-run |
| Skill loads by itself when you ask for a diagram | 4 of 4 skill-mode runs read SKILL.md first | state.json skill_read |
| "No Mermaid slop" (vs a plain agent) | Plain Sonnet answered with Mermaid in 3 of 4 runs (ER x2, sequence); 1 of 4 hand-wrote a multicolour SVG (architecture). Skill outputs: one accent colour, hairlines, serif title, legend. Visual difference is clear in the ER and sequence pairs; for architecture both are clean, and plain used 5 pastel colours vs the skill's 1 accent. | render/*.png |

## The catches
1. COST: skill runs used 377,847-462,090 tokens each (input + cache + output, the pipeline's counting rule); plain runs used 6,818-17,392. That's about 22x-68x more per diagram (ER: 435k/462k vs 7.0k/6.8k, so about 65x). The bulk is the skill reading its own SKILL.md (33 KB) + 6-9 reference/example files, then resending them each turn. One interrupted call during skill-arch-1 isn't in the log, so the real total is a little higher.
2. TIME: skill 197-293 s per diagram; plain 18-109 s.
3. IT CUTS DETAIL ON PURPOSE ("target density 4/10", max 5 lifelines per sequence). In the UPI sequence, the skill version left out webhook signature verification (0 mentions of HMAC/signature/verify), the customer's PIN step as its own lifeline, and the page learning the booking is confirmed. The plain Mermaid version had signature verification, "don't trust the browser callback", and a DB-down 500 retry path. Razorpay's docs say to verify the X-Razorpay-Signature (HMAC-SHA256 over the raw body with the webhook secret) before acting on a webhook. So the prettier diagram dropped a security-critical step. The ER versions dropped password_hash/bio/avatar fields that plain kept.
4. FIRST-RUN PAUSE: it won't draw on first use until you answer the brand question (4/4).
5. LAYOUT VARIES: same ER prompt twice gave the same style but a different layout (er-1 rollup arrow below the events vs er-2 L-shaped link). The README admits this.
6. Visual defects seen at 1x: large empty band above the diagram in all 4 skill outputs (title, then about 150-250 px of blank paper, then the diagram). Plain Mermaid sequence had labels running through lifelines (e.g. "Save booking as PENDING_PAYMENT", "Verify HMAC signature").

## Verdict (proposed): LEGIT*
It does what the README says: the look, the grid, the checks, one self-contained file, and it triggers by itself. Fine print: about 20-65x the tokens of a plain diagram in my test; it deletes detail by design, so check that it didn't cut a step that matters (it dropped webhook signature verification from a payment flow); and for docs that change every sprint, the README itself says Mermaid is the better fit.
