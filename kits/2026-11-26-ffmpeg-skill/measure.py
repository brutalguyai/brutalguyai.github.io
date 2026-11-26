"""Measure each run's final Reel against the README request. Usage: python3 measure.py <runs_dir> <source.mp4>"""
import json, os, re, subprocess, sys, glob
import numpy as np
RUNS, SRC = sys.argv[1], sys.argv[2]

def sh(c): return subprocess.run(c, capture_output=True, text=True).stdout + subprocess.run(c, capture_output=True, text=True).stderr if False else subprocess.run(c, capture_output=True, text=True)
def probe(f):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels', '-of', 'json', f], capture_output=True, text=True)
    return json.loads(r.stdout or '{}')
def lufs(f):
    e = subprocess.run(['ffmpeg', '-hide_banner', '-i', f, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = re.findall(r'I:\s+(-?[\d.]+) LUFS', e); P = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', e)
    return (float(I[-1]) if I else None, float(P[-1]) if P else None)
def pcm(f, ss=None, t=None, sr=8000):
    c = ['ffmpeg', '-v', 'error'] + (['-ss', str(ss)] if ss is not None else []) + ['-i', f] + (['-t', str(t)] if t else []) + ['-ac', '1', '-ar', str(sr), '-f', 's16le', '-']
    return np.frombuffer(subprocess.run(c, capture_output=True).stdout, np.int16).astype(np.float32)
def env(x, sr=8000, hop=80):   # 10 ms energy envelope
    n = len(x) // hop; return np.sqrt((x[:n*hop].reshape(n, hop) ** 2).mean(1) + 1)
def locate(out_env, src_env):
    """Where does each 1 s window of the output come from in the source? returns list of source seconds"""
    pos = []
    for s in range(0, len(out_env) - 100, 100):
        w = out_env[s:s+100]; w = (w - w.mean()) / (w.std() + 1e-6)
        best, bi = -1, None
        for j in range(0, len(src_env) - 100, 2):
            v = src_env[j:j+100]; c = float(np.dot(w, (v - v.mean()) / (v.std() + 1e-6))) / 100
            if c > best: best, bi = c, j
        pos.append((s / 100, bi / 100 if bi is not None else None, round(best, 2)))
    return pos

src_env = env(pcm(SRC, 0, 400))
rows = []
for d in sorted(glob.glob(os.path.join(RUNS, '*_*'))):
    if not os.path.isdir(d): continue
    log = json.load(open(os.path.join(d, 'agent_log.json'), encoding='utf-8')) if os.path.exists(os.path.join(d, 'agent_log.json')) else {}
    mp4s = [f for f in glob.glob(os.path.join(d, '**', '*.mp4'), recursive=True) if os.path.basename(f) != 'interview.mp4']
    report = ' '.join(sum((t.get('text', []) for t in log.get('turns', [])[-1:]), []))
    named = [f for f in mp4s if os.path.basename(f) in report]
    final = (named or sorted(mp4s, key=os.path.getmtime))[-1] if mp4s else None
    r = {'run': os.path.basename(d), 'stop': log.get('stop'), 'seconds': log.get('seconds'), 'turns': len(log.get('turns', [])),
         'tokens': sum(log.get('usage', {}).values()) if log else None, 'final': final and os.path.relpath(final, d), 'n_mp4': len(mp4s)}
    cmds = [c['input'].get('command', '') for t in log.get('turns', []) for c in t.get('calls', []) if c['tool'] == 'run']
    reads = [c['input'].get('path', '') for t in log.get('turns', []) for c in t.get('calls', []) if c['tool'] == 'read_file']
    r['read_skill_md'] = any('SKILL.md' in p for p in reads)
    r['skill_scripts_used'] = sorted({m for c in cmds for m in re.findall(r'scripts[\\/]+(\w+)\.py', c)})
    r['viewed_images'] = sum(1 for p in reads if p.lower().endswith(('.png', '.jpg', '.jpeg')))
    r['probed_output'] = any(('ffprobe' in c or 'probe.py' in c or 'check.py' in c) for c in cmds[len(cmds)//2:])
    if final:
        pr = probe(final); v = [s for s in pr.get('streams', []) if s['codec_type'] == 'video']; a = [s for s in pr.get('streams', []) if s['codec_type'] == 'audio']
        r['duration'] = round(float(pr['format']['duration']), 2); r['mb'] = round(int(pr['format']['size']) / 1e6, 1)
        if v: r['size'] = f"{v[0]['width']}x{v[0]['height']}"; r['fps'] = v[0]['r_frame_rate']; r['vcodec'] = v[0]['codec_name']
        r['audio'] = f"{a[0]['codec_name']} {a[0].get('sample_rate')} {a[0].get('channels')}ch" if a else None
        r['lufs'], r['peak'] = lufs(final)
        loc = locate(env(pcm(final)), src_env)
        r['source_map'] = [(o, s, c) for o, s, c in loc]
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', final, '-vf', 'fps=1/6,scale=180:-1,tile=10x1', '-frames:v', '1', os.path.join(d, 'qa_sheet.jpg')])
    rows.append(r)
json.dump(rows, open(os.path.join(RUNS, 'measure.json'), 'w'), indent=1)
for r in rows:
    print({k: v for k, v in r.items() if k != 'source_map'})
    if r.get('source_map'): print('   src@', [(o, s) for o, s, c in r['source_map'] if c > 0.6][:3], '...', [(o, s) for o, s, c in r['source_map'] if c > 0.6][-4:], ' low-conf:', sum(1 for *_, c in r['source_map'] if c <= 0.6))
