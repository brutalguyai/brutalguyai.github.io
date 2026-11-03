#!/usr/bin/env bash
# brutal guy.ai test runner: one headless Claude Code run with a hard budget.
# usage: run_api.sh <project_dir> <prompt_file> <out_dir> [budget_usd] [max_turns] [max_minutes]
set -u
PROJ=$1; PROMPT=$2; OUT=$3; BUDGET=${4:-3}; TURNS=${5:-60}; MINS=${6:-60}
MODEL=${MODEL:-claude-sonnet-5-5}
HERE=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$OUT"
date +%s > "$OUT/start.txt"
echo "model=$MODEL budget=\$$BUDGET turns=$TURNS minutes=$MINS" | tee "$OUT/config.txt"

cd "$PROJ"
# Claude Code enforces --max-budget-usd itself; the watchdog below is a second line of defence.
timeout --signal=INT --kill-after=30 "$((MINS*60))" \
  env -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_REMOTE_SESSION_ID -u CLAUDE_CODE_CHILD_SESSION \
  claude -p "$(cat "$PROMPT")" \
    --model "$MODEL" --max-turns "$TURNS" --max-budget-usd "$BUDGET" \
    --output-format stream-json --verbose \
    --permission-mode acceptEdits \
    --allowedTools "Read" "Write" "Edit" "Glob" "Grep" \
      "Bash(node:*)" "Bash(npm:*)" "Bash(npx playwright:*)" "Bash(python3:*)" "Bash(python:*)" \
      "Bash(pip:*)" "Bash(pip3:*)" "Bash(sh:*)" "Bash(ffmpeg:*)" "Bash(ffprobe:*)" \
      "Bash(.venv/bin/python:*)" "Bash(./.venv/bin/python:*)" "Bash($PROJ/.venv/bin/python:*)" \
      "Bash(ls:*)" "Bash(mkdir:*)" "Bash(cat:*)" "Bash(head:*)" "Bash(tail:*)" "Bash(wc:*)" \
    --disallowedTools "WebFetch" "WebSearch" "Agent" \
  2> "$OUT/stderr.log" | tee "$OUT/stream.jsonl" | python3 -u "$HERE/pretty.py" &
PIPE=$!

# Watchdog: estimates spend from usage in the stream (Sonnet list price) and stops the run at 1.1x budget.
python3 -u "$HERE/watchdog.py" "$OUT/stream.jsonl" "$BUDGET" >> "$OUT/watchdog.log" 2>&1 &
WD=$!
wait $PIPE
kill $WD 2>/dev/null
date +%s > "$OUT/end.txt"
echo "secs $(( $(cat "$OUT/end.txt") - $(cat "$OUT/start.txt") ))" | tee -a "$OUT/config.txt"
