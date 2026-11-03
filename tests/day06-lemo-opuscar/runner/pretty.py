"""Turns Claude Code stream-json into a readable terminal log (this is what gets screen-recorded)."""
import json, sys, time

T0 = time.time()
B, DIM, CY, YE, GR, RE, R = '\033[1m', '\033[2m', '\033[36m', '\033[33m', '\033[32m', '\033[31m', '\033[0m'

def stamp():
    s = int(time.time() - T0)
    return f'{DIM}[{s // 60:02d}:{s % 60:02d}]{R}'

for line in sys.stdin:
    try:
        ev = json.loads(line)
    except ValueError:
        continue
    t = ev.get('type')
    if t == 'system' and ev.get('subtype') == 'init':
        print(f"{stamp()} {B}session start{R}  model={ev.get('model')}")
    elif t == 'assistant':
        for c in ev.get('message', {}).get('content', []):
            if c.get('type') == 'text' and c['text'].strip():
                print(f"{stamp()} {c['text'].strip()[:600]}")
            elif c.get('type') == 'tool_use':
                inp = c.get('input', {})
                arg = inp.get('command') or inp.get('file_path') or inp.get('pattern') or json.dumps(inp)[:120]
                print(f"{stamp()} {CY}▶ {c['name']}{R} {DIM}{str(arg)[:160]}{R}")
    elif t == 'rate_limit_event':
        print(f"{stamp()} {YE}rate limit event:{R} {json.dumps(ev)[:200]}")
    elif t == 'result':
        col = GR if ev.get('subtype') == 'success' else RE
        print(f"\n{stamp()} {col}{B}RUN ENDED: {ev.get('subtype')}{R}")
        print(f"   cost ${ev.get('total_cost_usd', 0):.2f}   turns {ev.get('num_turns')}   time {ev.get('duration_ms', 0) / 60000:.1f} min")
    sys.stdout.flush()
