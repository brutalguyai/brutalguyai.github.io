#!/bin/bash
# usage: run.sh <variant: opus|omega|haiku> <n>
v=$1; n=$2; src=tpl; model=claude-opus-5-5
[ "$v" = omega ] && src=omega
[ "$v" = haiku ] && model=claude-haiku-5-5
d=/home/claude/ep2/runs/${v}_$n; rm -rf $d; mkdir -p /home/claude/ep2/runs; cp -r /home/claude/ep2/$src $d; cd $d
KEY=$(grep '^ANTHROPIC_API_KEY=' /mnt/user-data/uploads/brutal-guy-ai/.env | cut -d= -f2)
mkdir -p /home/claude/ep2/home_$v$n
PROMPT='Implement the feature described in TASK.md. Test your work. When everything is done, reply DONE.'
s=$(date +%s.%N)
env -i PATH="$PATH" HOME=/home/claude/ep2/home_$v$n HTTPS_PROXY="$HTTPS_PROXY" https_proxy="$https_proxy" NODE_EXTRA_CA_CERTS="$NODE_EXTRA_CA_CERTS" SSL_CERT_FILE="$SSL_CERT_FILE" ANTHROPIC_API_KEY="$KEY" timeout 600 claude -p "$PROMPT" --model $model --output-format stream-json --verbose --max-turns 60 --permission-mode acceptEdits --allowedTools "Read" "Edit" "Write" "Glob" "Grep" "Task" "Agent" "Bash(python3:*)" "Bash(pytest:*)" "Bash(ls:*)" "Bash(cat:*)" < /dev/null > /home/claude/ep2/out/${v}_$n.jsonl 2> /home/claude/ep2/out/${v}_$n.err
e=$(date +%s.%N)
cp /home/claude/ep2/hidden/test_hidden.py /tmp/th_$v$n.py
res=$(cd $d && python3 -m pytest -q -p no:cacheprovider /tmp/th_$v$n.py --rootdir=$d 2>&1 | tail -1)
echo "${v}_$n secs=$(echo "$e - $s" | bc) hidden: $res" | tee -a /home/claude/ep2/out/summary.txt
