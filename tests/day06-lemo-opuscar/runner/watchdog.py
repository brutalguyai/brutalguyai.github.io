"""Backup budget guard: estimates spend from the stream's usage numbers and stops claude at 1.1x the budget.
Estimate uses Sonnet list prices per million tokens; Claude Code's own --max-budget-usd is the primary cap."""
import json, os, signal, subprocess, sys, time

path, budget = sys.argv[1], float(sys.argv[2])
P = dict(inp=3.0, out=15.0, cw=3.75, cr=0.30)
seen, est, pos = set(), 0.0, 0
while True:
    time.sleep(5)
    if not os.path.exists(path):
        continue
    with open(path) as f:
        f.seek(pos)
        for line in f:
            try:
                ev = json.loads(line)
            except ValueError:
                continue
            if ev.get('type') == 'result':
                print(f'run finished, final estimate ${est:.2f}')
                sys.exit(0)
            if ev.get('type') != 'assistant':
                continue
            m = ev.get('message', {})
            if m.get('id') in seen:
                continue
            seen.add(m.get('id'))
            u = m.get('usage', {})
            est += (u.get('input_tokens', 0) * P['inp'] + u.get('output_tokens', 0) * P['out']
                    + u.get('cache_creation_input_tokens', 0) * P['cw'] + u.get('cache_read_input_tokens', 0) * P['cr']) / 1e6
        pos = f.tell()
    print(f'{time.strftime("%H:%M:%S")} estimate ${est:.2f}')
    if est > budget * 1.1:
        print(f'BUDGET: estimate ${est:.2f} passed ${budget * 1.1:.2f}, stopping claude')
        subprocess.run(['pkill', '-INT', '-f', '--max-budget-usd'])
        sys.exit(1)
