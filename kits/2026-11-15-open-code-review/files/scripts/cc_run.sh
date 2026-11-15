#!/bin/bash
# usage: cc_run.sh N
cd $HOME/work/${2:-target}
export ANTHROPIC_API_KEY=$(grep '^ANTHROPIC_API_KEY=' $HOME/mnt/brutal-guy-ai/.env | cut -d= -f2-)
unset CLAUDE_CODE_SESSION_ID CLAUDE_CODE_OAUTH_TOKEN
export HOME_CC=$HOME/work/cchome; mkdir -p $HOME_CC
start=$(date +%s)
CLAUDE_CONFIG_DIR=$HOME_CC timeout 165 $HOME/work/cc/node_modules/.bin/claude -p "Review the changes on branch feature compared to main (git diff main...feature). Report each real bug or security issue with file and line. Be concise." --model claude-sonnet-5-5 --max-turns 20 --output-format stream-json --verbose --permission-mode acceptEdits --allowedTools "Bash(git:*)" Read Grep Glob > $HOME/work/runs/cc$1.jsonl 2>$HOME/work/runs/cc$1.err
echo exit=$? secs=$(( $(date +%s)-start ))
