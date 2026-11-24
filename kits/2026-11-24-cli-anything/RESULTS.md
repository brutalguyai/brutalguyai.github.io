# HKUDS/CLI-Anything: test results (2026-11-23/24)
Repo: https://github.com/HKUDS/CLI-Anything (head 34f5195 as cloned 2026-11-23). GitHub Trending daily 2026-11-23: +783 stars, 63.4K total.
Claim (README): "One Command Line: Make any software agent-ready for Pi, OpenClaw, nanobot, Cursor, Claude Code, etc." / "Bridging the Gap Between AI Agents and the World's Software".
Harness tested: cli-anything-libreoffice (CLI-Anything/libreoffice/agent-harness + skills/cli-anything-libreoffice/SKILL.md). Only this one harness was tested, not the other ~80.

## Setup
- Agent: Claude Sonnet 5.5 via the Anthropic API (run.py), one bash tool, 45-turn / 400K-token cap per run, Swapnil's laptop (Linux VM, LibreOffice installed).
- Task (task.txt, a mini project): flat of 4, 15 November expenses (expenses.csv, Rs 81,804.02). Build a LibreOffice spreadsheet: "Expenses" sheet + "Summary" sheet with paid / fair share / balance as formulas; save .ods, export .xlsx + .pdf; say who pays whom.
- Truth (truth.json): Aarav +34,837.60; Bhavna -14,583.19; Chirag -9,182.41; Divya -11,072.01 (share 20,451.005).
- Modes, 3 runs each: PLAIN (LibreOffice + python only); CLI (same + the CLI on PATH, listed like a Claude Code skill with its SKILL.md path, use optional); FORCE (same as CLI + task line "Build the spreadsheet with the cli-anything-libreoffice tool.").
- check.py: recalculates each .ods in LibreOffice, compares all 10 numbers to truth, counts formula cells; logs show which commands ran.

## Results
| run | 3 files | numbers right | turns | tokens | finished? | how it built the sheet |
|---|---|---|---|---|---|---|
| plain_1 | yes | 10/10 | 7 | 24,385 | yes | openpyxl + soffice |
| plain_2 | yes | 10/10 | 9 | 34,908 | yes | openpyxl + soffice |
| plain_3 | yes | 10/10 | 6 | 22,446 | yes | openpyxl + soffice |
| cli_1 | yes | 10/10 | 7 | 31,146 | yes | read SKILL.md + --help, then openpyxl (0 CLI build commands) |
| cli_2 | yes | 10/10 | 10 | 61,845 | yes | same: 0 CLI build commands |
| cli_3 | yes | 10/10 | 8 | 39,848 | yes | same: 0 CLI build commands |
| force_1 | yes | 0/10 (Summary = Err:510) | 26 | 427,560 | NO, hit token cap | CLI, then 11 commands hand-editing content.xml |
| force_2 | yes | 10/10 | 29 | 400,584 | NO, hit token cap | CLI, then hand-patched content.xml (9 cmds) + soffice |
| force_3 | yes | 10/10 | 27 | 422,814 | NO, hit token cap | CLI, then patch.py on content.xml (10 cmds) + soffice |
Medians: plain 24,385 tokens / 7 turns; CLI-optional 39,848 / 8; forced 422,814 / 27 (17x plain). No forced run reached its final answer to the user.
Total tester tokens: 1,465,536.

## Bugs reproduced by hand (outside the agent runs, /tmp/v)
1. `export render file.pdf` / `file.xlsx` / `file.ods` without `-p` writes an OpenDocument TEXT file with that name (`file` says "OpenDocument Text" for all three). With `-p xlsx|pdf|ods` the formats are right.
2. Formulas from `calc set-cell --formula` never computed in LibreOffice in my tests. The tool writes `of:` + whatever you pass (odf_utils.py line 346):
   "=SUM(A1:A2)" -> of:=SUM(A1:A2) -> Err:510 ; "=1+2" -> Err:510 ; "SUM(A1:A2)" -> of:SUM(A1:A2) -> Err:509 ; "of:=SUM([.A1:.A2])" -> of:of:=... -> Err:510 ; "1+2" -> #NAME?
   In the .xlsx export the cell holds the text "=of:=SUM(A1:A2)" -> Err:510.
3. SKILL.md says it works "without a GUI or LibreOffice installation" and, two lines later, lists "libreoffice must be installed" as a prerequisite. There is no chart command in the Calc group.

## Root cause of the formula bug (checked 2026-11-24)
- Same Err:510 on a second machine (cloud, LibreOffice 24.2.7.2), so it's not a quirk of my laptop.
- The tool writes table:formula="of:=..." but never declares the "of" namespace (xmlns:of="urn:oasis:names:tc:opendocument:xmlns:of:1.2") in content.xml. Adding only that one declaration to the same file: =SUM(A1:A2) -> 350 and =1+2 -> 3. So it's a small, fixable bug.
- The repo's own unit test (tests/test_core.py:208) only checks that 'table:formula="of:=A1+A2"' is written into the XML; it never opens the file in LibreOffice, so it can't catch this.

## Not tested
Other CLI-Anything harnesses (GIMP, Blender, Obsidian, n8n, ...), the CLI-Hub installer, the /cli-anything generator that builds a harness for new software, Claude Code itself (direct API emulation of skill listing).

## Verdict (LibreOffice harness): OVERHYPED
Given the choice, Sonnet read the skill and ignored it 3/3 and did the job with python in ~25-60K tokens. Forced to use it, formulas came out broken (Err:510) and the agent spent 17x the tokens hand-patching the file's XML; it ran out of budget all 3 times. Plain Sonnet: 3/3 correct, ~24K tokens. Caveat in video: one harness of many; the generator itself not tested.
