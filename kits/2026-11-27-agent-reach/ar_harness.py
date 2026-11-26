"""brutal guy.ai - ffmpeg-skill test harness (Nov 26 2026).
One agent run = Claude (Sonnet) with 3 tools (run a PowerShell command, read a file incl. images, write a file),
like Claude Code. Mode "skill" lists ffmpeg-skill the way Claude Code lists an installed skill (name + description +
path to SKILL.md); mode "plain" lists nothing. Same user prompt for both: the README's own example.
Usage: python ar_harness.py <skill|plain> <task_id> <run_no> <episode_dir>
Reads ANTHROPIC_API_KEY from D:\\brutal-guy-ai\\.env itself; never prints it.
"""
import base64, json, os, subprocess, sys, time, urllib.request, urllib.error

MODE, TASK, N, EP = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
ROOT = os.path.abspath(os.path.join(EP, '..', '..'))
KEY = None
for l in open(os.path.join(ROOT, '.env'), encoding='utf-8-sig'):
    if l.strip().startswith('ANTHROPIC_API_KEY='): KEY = l.split('=', 1)[1].strip()
MODEL = 'claude-sonnet-5-5'
MAX_TURNS, TOKEN_CAP = 25, 120_000          # per run; 30 runs stay under the 2M tester cap (avg must be < 66K)
TASKS = {
 'yt':  'Summarize what this YouTube video actually says, in 5 bullet points, based on its spoken content: https://www.youtube.com/watch?v=aircAruvnKk',
 'v2ex':'What are the top 5 hot topics on V2EX right now? Give their titles and links.',
 'gh':  'How many GitHub stars does Panniantong/Agent-Reach have right now, and what is its latest release version?',
 'reddit':'Find 3 Reddit posts from the past week about Claude Code. Give each title, subreddit and link.',
 'web': 'Read https://www.anthropic.com/engineering/building-effective-agents and give me its 3 key points.'}
PROMPT = TASKS[TASK]
SKILL_DIR = os.path.join(os.path.expanduser('~'), '.agents', 'skills', 'agent-reach')
RUN = os.path.join(EP, 'work', 'runs', f'{TASK}_{MODE}_{N}')
os.makedirs(RUN, exist_ok=True)
# plain mode: hide what Agent Reach installed (uv tools dir), so plain Claude only has the laptop's normal tools
if MODE == 'plain':
    os.environ['PATH'] = os.pathsep.join(p for p in os.environ['PATH'].split(os.pathsep) if '.local' not in p.lower() and 'agent-reach' not in p.lower() and 'uv\\tools' not in p.lower())
desc = ''
_lines = open(os.path.join(SKILL_DIR, 'SKILL.md'), encoding='utf-8').read().splitlines()
for _i, l in enumerate(_lines):
    if l.startswith('description:'):
        desc = l.split(':', 1)[1].strip().strip('"').strip("'")
        if desc in ('', '>', '|', '>-', '|-'):
            desc = ' '.join(x.strip() for x in _lines[_i+1:] if x.startswith((' ', '\t')) and x.strip())[:1024] if True else desc
            _j = _i + 1; parts = []
            while _j < len(_lines) and (_lines[_j].startswith((' ', '\t'))): parts.append(_lines[_j].strip()); _j += 1
            desc = ' '.join(parts)
        break
SYSTEM = (f"You are Claude Code, an AI coding agent working on the user's Windows laptop.\n"
          f"Working directory: {RUN}\nShell: PowerShell (use the `run` tool). Python 3.12 is available as `python`; "
          f"ffmpeg and ffprobe are on PATH.\nWork autonomously to complete the user's request, then reply with a short "
          f"report of what you produced.")
if MODE == 'skill':
    SYSTEM += (f"\n\n<available_skills>\n<skill>\n<name>agent-reach</name>\n<description>{desc}</description>\n"
               f"<location>{os.path.join(SKILL_DIR, 'SKILL.md')}</location>\n</skill>\n</available_skills>\n"
               f"When a task matches a skill, read its SKILL.md first and follow it. The skill's files are in "
               f"{SKILL_DIR}.")
TOOLS = [
 {"name": "run", "description": "Run a PowerShell command in the working directory. Returns stdout+stderr (truncated) and the exit code.",
  "input_schema": {"type": "object", "properties": {"command": {"type": "string"}}, "required": ["command"]}},
 {"name": "read_file", "description": "Read a text file, or view an image (.png/.jpg) so you can see it.",
  "input_schema": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}},
 {"name": "write_file", "description": "Create or overwrite a text file.",
  "input_schema": {"type": "object", "properties": {"path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]}}]

def api(body):
    for attempt in range(6):
        req = urllib.request.Request('https://api.anthropic.com/v1/messages', data=json.dumps(body).encode(),
              headers={'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'})
        try: return json.load(urllib.request.urlopen(req, timeout=300))
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:300]
            if e.code in (429, 500, 502, 503, 529): time.sleep(15 * (attempt + 1)); continue
            raise SystemExit(f'API error {e.code}: {msg}')
        except Exception as e: time.sleep(10); last = e
    raise SystemExit('API unreachable')

def p(x): return x if os.path.isabs(x) else os.path.join(RUN, x)
def tool(name, inp):
    if name == 'run':
        t = time.time()
        try:
            r = subprocess.run(['powershell', '-NoProfile', '-Command', inp['command']], cwd=RUN, capture_output=True,
                               text=True, encoding='utf-8', errors='replace', timeout=300)
            out, code = (r.stdout or '') + (r.stderr or ''), r.returncode
        except subprocess.TimeoutExpired: out, code = 'timed out after 300 s', -1
        if len(out) > 12000: out = out[:6000] + '\n...[truncated]...\n' + out[-6000:]
        return [{"type": "text", "text": f"exit code {code} ({time.time()-t:.1f}s)\n{out}"}]
    if name == 'read_file':
        f = p(inp['path'])
        if not os.path.exists(f): return [{"type": "text", "text": "file not found"}]
        if f.lower().endswith(('.png', '.jpg', '.jpeg')):
            b = open(f, 'rb').read()
            if len(b) > 4_500_000: return [{"type": "text", "text": "image too large to view (>4.5 MB)"}]
            return [{"type": "image", "source": {"type": "base64", "media_type": 'image/png' if f.lower().endswith('.png') else 'image/jpeg', "data": base64.b64encode(b).decode()}}]
        t = open(f, encoding='utf-8', errors='replace').read()
        return [{"type": "text", "text": t if len(t) < 60000 else t[:60000] + '\n...[truncated]'}]
    if name == 'write_file':
        f = p(inp['path']); os.makedirs(os.path.dirname(f) or '.', exist_ok=True)
        open(f, 'w', encoding='utf-8').write(inp['content']); return [{"type": "text", "text": "written"}]
    return [{"type": "text", "text": "unknown tool"}]

msgs = [{"role": "user", "content": PROMPT}]
log = {"mode": MODE, "run": N, "model": MODEL, "prompt": PROMPT, "system": SYSTEM, "turns": [], "usage": {"input": 0, "output": 0, "cache_read": 0, "cache_write": 0}}
t0 = time.time(); stop = 'max_turns'
for turn in range(MAX_TURNS):
    r = api({"model": MODEL, "max_tokens": 8000, "system": SYSTEM, "tools": TOOLS, "messages": msgs})
    u = r.get('usage', {})
    for k, a in (('input', 'input_tokens'), ('output', 'output_tokens'), ('cache_read', 'cache_read_input_tokens'), ('cache_write', 'cache_creation_input_tokens')):
        log['usage'][k] += u.get(a, 0) or 0
    msgs.append({"role": "assistant", "content": r['content']})
    calls = [c for c in r['content'] if c['type'] == 'tool_use']
    entry = {"turn": turn, "text": [c['text'] for c in r['content'] if c['type'] == 'text'], "calls": [], "elapsed": round(time.time() - t0, 1)}
    if not calls:
        log['turns'].append(entry); stop = 'done'; break
    results = []
    for c in calls:
        out = tool(c['name'], c['input'])
        entry['calls'].append({"tool": c['name'], "input": c['input'], "output": [o.get('text', '[image]') for o in out]})
        results.append({"type": "tool_result", "tool_use_id": c['id'], "content": out})
    msgs.append({"role": "user", "content": results}); log['turns'].append(entry)
    total = sum(log['usage'].values())
    print(f"[{MODE} {N}] turn {turn+1}: {', '.join(c['name'] for c in calls)}  tokens {total:,}", flush=True)
    if total > TOKEN_CAP: stop = 'token_cap'; break
log['stop'], log['seconds'] = stop, round(time.time() - t0, 1)
json.dump(log, open(os.path.join(RUN, 'agent_log.json'), 'w', encoding='utf-8'), indent=1)
print(f"[{MODE} {N}] {stop} in {log['seconds']} s, tokens {sum(log['usage'].values()):,}")
