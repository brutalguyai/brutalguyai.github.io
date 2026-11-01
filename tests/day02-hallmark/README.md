# Day 2: Nutlope/hallmark (anti-"AI-looking" design skill)

**Question:** does the Hallmark skill make Claude Code build sites that don't look AI-made?

| Folder | What ran | Prompt |
|---|---|---|
| `plain/` | Plain Claude Code, no skill | [prompt.txt](plain/prompt.txt) |
| `redesign/` | `/hallmark redesign` on the plain page | [prompt.txt](redesign/prompt.txt) |
| `theme_formwork/`, `theme_sport/` | `/hallmark --fast` with two of its 48 themes | prompt.txt in each |

Open each `index.html` in a browser to see the result. `TRANSCRIPT.md` in each folder shows every step the agent took.

**Results shown in the video**
- Hallmark's own checker: 59 problems on the plain page → 0 after the redesign.
- Kept every link, the form and the script hooks (checked by the skill).
- Catch: about 8 min vs 2 min, and about 7× the cost.

**Rerun it:** install Claude Code, then `npx skills add Nutlope/hallmark`, copy `plain/prompt.txt` into an empty folder, run it, then run the redesign prompt.
