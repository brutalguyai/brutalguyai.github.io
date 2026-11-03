"""Mix for "Farm to Cup": synthesised score (marimba ostinato, kick, bass, sine glide for the exception) + print foley + Kokoro voice.
python films/coffee/mix.py   (run events.mjs first)"""
import sys, os, json, numpy as np, soundfile as sf
from scipy.signal import resample_poly
from scipy.ndimage import maximum_filter1d, uniform_filter1d
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '../../core/audio'))
import sfx
from sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, add

rng = np.random.default_rng(5)
ev = json.load(open(os.path.join(HERE, 'events.json')))
DUR = ev['dur']; N = int((DUR + .4) * SR)
BEAT = .5

# ---------------- foley (dry, close: metal type, paper, knife) ----------------
def clack(big=False):
    d = .12 if big else .07; tt = t_(d); p = .92 + rng.random() * .16
    x = hp(noise(d), 2500) * env_exp(d, .0012) * .9
    x += sum(a * np.sin(2 * np.pi * f * p * tt + rng.random() * 6) * env_exp(d, tau) for f, a, tau in [(3300, .45, .010), (5100, .25, .006), (1250, .35, .016)])
    x += np.sin(2 * np.pi * (140 if big else 420) * p * tt) * env_exp(d, .03 if big else .012) * (.9 if big else .35)
    return norm(x)
def rule():
    d = .05; return norm(bp(noise(d), 3000, 9000) * np.sin(np.pi * t_(d) / d) ** 2)
def knife(d=.16):
    n = noise(d); tt = t_(d); out = np.zeros_like(n); hop = 240
    for i in range(0, len(n), hop):
        f = 1500 + 4500 * (i / len(n)) ** 1.5
        seg = bp(n[max(0, i - 1200):i + hop], f * .8, min(f * 1.25, 20000))[-hop:]; out[i:i + len(seg)] = seg
    out *= np.minimum(1, tt / (d * .7)) ** 1.5 * np.exp(-np.maximum(0, tt - d * .8) / .02)
    sn = t_(.08); snick = np.sin(2 * np.pi * 4200 * sn) * env_exp(.08, .012) + hp(noise(.08), 4000) * env_exp(.08, .003)
    x = out * .7; x[-len(sn):] += snick[:len(sn)] * .8
    return norm(x)
def paper():
    d = .25; tt = t_(d)
    return norm(lp(noise(d), 900) * env_exp(d, .03) + np.sin(2 * np.pi * 110 * tt) * env_exp(d, .04) * .6 + hp(noise(d), 3000) * env_exp(d, .006) * .4)
def thunk():
    d = .12; tt = t_(d); return norm(np.sin(2 * np.pi * 95 * tt) * env_exp(d, .025) + bp(noise(d), 300, 1500) * env_exp(d, .006) * .6)
def slide(d=.4):
    tt = t_(d); return norm(bp(noise(d), 700, 5000) * np.sin(np.pi * tt / d) ** 1.5)
def snap():
    d = .05; tt = t_(d)
    return norm(hp(noise(d), 1500) * env_exp(d, .002) + np.sin(2 * np.pi * 1900 * tt) * env_exp(d, .007) * .6 + np.sin(2 * np.pi * 620 * tt) * env_exp(d, .01) * .4)
def thump():
    d = .45; tt = t_(d)
    return norm(np.sin(2 * np.pi * 58 * tt * (1 - .25 * tt)) * env_exp(d, .09) + lp(noise(d), 250) * env_exp(d, .02) * .4)
def tick():
    d = .03; tt = t_(d); return norm(np.sin(2 * np.pi * 3600 * tt) * env_exp(d, .004) + hp(noise(d), 5000) * env_exp(d, .001) * .5)

FOLEY = {'clack': (lambda: clack(), .16), 'clackBig': (lambda: clack(True), .26), 'rule': (lambda: rule(), .07),
         'knife': (lambda: knife(), .22), 'paper': (lambda: paper(), .30), 'thunk': (lambda: thunk(), .24),
         'slide': (lambda: slide(), .10), 'snap': (lambda: snap(), .12), 'thump': (lambda: thump(), .5), 'tick': (lambda: tick(), .10)}
fol = np.zeros((N, 2))
for e in ev['ev']:
    if e['type'] not in FOLEY: continue
    fn, g = FOLEY[e['type']]; x = fn().astype(np.float64); at = e['t']
    if e['type'] == 'knife': at -= len(x) / SR - .02      # the snick lands on the beat
    add(fol, x, at, g * e.get('g', 1), pan=float(rng.uniform(-.25, .25)))

# ---------------- score: 120 bpm, marimba ostinato in A minor pentatonic ----------------
def mid(m): return 440 * 2 ** ((m - 69) / 12)
def marimba(f, d=.5, v=1.0):
    tt = t_(d); x = np.sin(2 * np.pi * f * tt) * np.exp(-tt / .22) + .35 * np.sin(2 * np.pi * f * 3.93 * tt) * np.exp(-tt / .05) + .12 * np.sin(2 * np.pi * f * 9.2 * tt) * np.exp(-tt / .02)
    x[:int(.002 * SR)] *= np.linspace(0, 1, int(.002 * SR)); return x * v
def kick(v=1.0):
    d = .3; tt = t_(d); ph = 2 * np.pi * (45 * tt + 70 * (1 - np.exp(-tt * 30)) / 30)
    return (np.sin(ph) * np.exp(-tt / .09) + .2 * hp(noise(d), 2000) * env_exp(d, .004)) * v
def bass(f, d=.45, v=1.0):
    tt = t_(d); x = np.sin(2 * np.pi * f * tt) + .45 * np.sin(2 * np.pi * 2 * f * tt) + .2 * np.sin(2 * np.pi * 3 * f * tt)
    return x * np.minimum(1, tt / .008) * np.exp(-tt / .25) * v
mus = np.zeros((N, 2))
PENT = [57, 60, 64, 67, 69, 72, 64, 60]           # A3 C4 E4 G4 A4 C5 E4 C4: one note per eighth
BASSN = [33, 33, 36, 31]                           # A1 A1 C2 G1 per bar -> raised an octave for small speakers
def active(t, what):
    if t < 0: return False
    if what == 'mar':  return not (9.5 <= t < 12.5) and t < 18.0
    if what == 'kick': return 3.5 <= t < 15.5 and not (6.0 <= t < 6.5) and not (9.5 <= t < 12.5) or 15.5 <= t < 17.0 and False
    if what == 'bass': return 6.5 <= t < 9.5 or 12.5 <= t < 16.5
    return False
for i in range(int(18.0 / (BEAT / 2))):
    t = i * BEAT / 2
    # one instrument added per page; the ostinato thins in the last bars
    if active(t, 'mar') and not (t >= 6.0 and t < 6.5):
        n = PENT[i % 8]
        if 15.5 <= t and i % 2: continue
        if t < 3.5 and i % 2: continue                       # page 1: half density
        add(mus, marimba(mid(n), .5), t, .34 if t >= 3.5 else .30, pan=-.15 + .3 * ((i % 4) / 3))
    if i % 2 == 0 and active(t, 'kick'): add(mus, kick(), t, .38)
    if i % 2 == 0 and active(t, 'bass'):
        bar = int(t / 2) % 4; add(mus, bass(mid(BASSN[bar] + 12), .45), t, .26)
# sine glide for the exception: follows the dot's x (1398 → 1726 px), linear, the only thing that sings
for e in ev['ev']:
    if e['type'] == 'glide':
        a, b = e['t'], e['t1']; n = int((b - a) * SR); tt = np.arange(n) / SR; u = tt / (b - a)
        f = 330 * 2 ** (u * 1.0); ph = 2 * np.pi * np.cumsum(f) / SR
        env = np.minimum(1, tt / .15) * np.minimum(1, (b - a - tt) / .3)
        g = (np.sin(ph) + .15 * np.sin(2 * ph)) * env * .16
        s = int(a * SR); mus[s:s + n, 0] += g * (1 - .35 * u); mus[s:s + n, 1] += g * (.65 + .35 * u)
# last note
add(mus, marimba(mid(57), 1.4), 18.5, .38, pan=0)
add(mus, marimba(mid(69), 1.4), 18.5, .20, pan=0)

# ---------------- voice (compressed) ----------------
lines = json.load(open(os.path.join(HERE, 'lines.json')))
vo = np.zeros((N, 2)); vad = np.zeros(N)
starts = {e['id']: e['t'] for e in ev['ev'] if e['type'] == 'voice'}
for L in lines:
    y, sr = sf.read(os.path.join(HERE, 'voices', L['id'] + '.wav'))
    if y.ndim > 1: y = y.mean(1)
    y = resample_poly(y, SR, sr); y = hp(y, 90)
    y = sfx.compress(y / (np.abs(y).max() + 1e-9), thr=.3, ratio=3, att=.003, rel=.1); y = norm(y, .9)
    add(vo, y, starts[L['id']], .75)
    s = int(starts[L['id']] * SR); vad[s:s + len(y)] = 1
vad = maximum_filter1d(vad, size=int(.16 * SR)); vad = uniform_filter1d(vad, size=int(.25 * SR))
duck = 1 - .68 * vad                               # about -10 dB under voice

mus_d = mus * duck[:, None] * .45
mix = mus_d + vo + fol
for c in range(2): mix[:, c] = sfx.limit(mix[:, c], .95)
assert np.isfinite(mix).all()
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR, subtype='FLOAT')

def db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print('peak %.2f dBFS' % (20 * np.log10(np.abs(mix).max())))
for k, L in enumerate(lines):
    s = int(starts[L['id']] * SR); e = s + int(sf.info(os.path.join(HERE, 'voices', L['id'] + '.wav')).duration * SR)
    print(f"{L['id']} voice {db(vo[s:e]):6.1f}  music {db(mus_d[s:e]):6.1f}  foley {db(fol[s:e]):6.1f}  voice-music {db(vo[s:e]) - db(mus_d[s:e]):5.1f} dB")
# low-end balance (20-120 Hz vs the rest)
m = mus_d.mean(1); lo = lp(m, 120); print('music 20-120 Hz vs full: %.1f dB' % (db(lo) - db(m)))
