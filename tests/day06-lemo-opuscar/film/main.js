// Farm to Cup: one signal dot, six pages. Everything snaps (precise ease) except the dot at sea (linear).
import { E, seg, lerp, clamp, snap, track, BEAT } from './ease.js';

const FONT = 'Inter, "Inter Display", sans-serif';
await Promise.all(['400', '500', '700', '900'].map(w => document.fonts.load(`${w} 40px Inter`)));

const W = 1920, H = 1080, DUR = 20;
const C = { page: '#F2F0EA', paper: '#FFFFFF', ink: '#141414', sig: '#FF5A00', g1: '#DEDBD2', g2: '#BDB9AE', g3: '#8A867B' };
const cv = document.getElementById('c'), ctx = cv.getContext('2d');

// ---------- timeline ----------
const LAND = [0, 3.5, 6.5, 9.5, 12.5, 15.5];           // page k lands (beat 7, 13, 19, 25, 31)
const PANDUR = 0.5;
const LINES = [
  { t: 0.4,  d: 1.869, text: 'Every cup begins as a cherry.' },
  { t: 3.7,  d: 2.271, text: 'Picked by hand, high on a farm.' },
  { t: 6.7,  d: 1.943, text: 'Dried, hulled, packed in sacks.' },
  { t: 9.7,  d: 1.955, text: 'Shipped across the sea, in weeks.' },
  { t: 12.7, d: 1.957, text: 'Roasted until it turns dark.' },
  { t: 15.7, d: 1.938, text: 'Then brewed, and poured for you.' },
];
const LEAD = ['01 / cherry', '02 / farm', '03 / mill', '04 / sea', '05 / roast', '06 / cup'];
const NAMES = ['cherry', 'farm', 'mill', 'sea', 'roast', 'cup'];
// word times (no ASR model available offline: proportional to characters, pause after commas)
for (const L of LINES) {
  const ws = L.text.split(' '); const wt = ws.map(w => w.replace(/[^\w]/g, '').length + (/,$/.test(w) ? 2.5 : 0) + .5);
  const sum = wt.reduce((a, b) => a + b, 0); let acc = 0; L.words = [];
  ws.forEach((w, i) => { L.words.push({ w, t: L.t + (acc / sum) * L.d - .04 }); acc += wt[i]; });
}
const camX = t => { let x = 0; for (let k = 1; k < 6; k++) x += W * E(seg(t, LAND[k] - PANDUR, LAND[k])); return x; };
const page = t => camX(t) / W;

// ---------- the dot (screen space; pages slide under it) ----------
const lin = (t, a, b, v0, v1) => lerp(v0, v1, seg(t, a, b));
function dot(t) {
  let x = 1398, y = 470, r = 170, sq = 0, ink = 0;
  // page 0
  if (t < 3.0) { r = 170 * snap(t, .3, .25); }
  // page 1: shrink into the field, then picked
  r = t < 3.0 ? r : lerp(170, 24, snap(t, 3.5 + .5, .5));
  if (t >= 3.5) { y = lerp(470, 190, snap(t, 5.0, .5)); r = t < 5.0 ? r : lerp(24, 30, snap(t, 5.0, .5)); }
  // page 2: squash to a bean, dry, drop onto the sack
  if (t >= 6.5) { sq = snap(t, 7.0, .5); y = lerp(190, 530, snap(t, 8.5, .5)); r = lerp(30, 40, sq); }
  // page 3: the exception: linear, unsnapped, drifting off grid
  if (t >= 9.5) {
    const s = seg(t, 10.0, 12.2);
    x = lerp(1398, 1726, s); y = 530 - 70 * Math.sin(s * Math.PI * .9) + 0.0; if (s >= 1) y = lerp(530, 470, 0);
    y = 530 - 60 * s;
  }
  // page 4: roast: steps along the scale, ink wipe
  if (t >= 12.5) {
    const s = snap(t, 13.0, .5);                    // back to the start of the scale
    x = lerp(1726, 1062, s); y = lerp(470, 470, s);
    const p = seg(t, 13.5, 15.0) * 6, i = Math.floor(p);
    const st = p >= 6 ? 1 : (i + E(p - i)) / 6;
    if (t >= 13.5) x = lerp(1062, 1734, st);
    ink = seg(t, 13.5, 15.0);
  }
  // page 5: ring closes, dot becomes the surface of the coffee
  if (t >= 15.5) {
    const s = snap(t, 15.5, .5);
    x = lerp(1734, 1398, s); r = lerp(40, 118, s); sq = lerp(1, 0, s); ink = 1; y = 470;
  }
  return { x, y, r, sq, ink };
}
const BEANY = 530 - 60;   // (unused marker)

// ---------- drawing helpers ----------
function txt(s, x, y, size, weight, color, align = 'left', track = 0) {
  ctx.font = `${weight} ${size}px ${FONT}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = `${track * size}px`; ctx.fillText(s, x, y);
}
const meas = (s, size, weight, track = 0) => { ctx.font = `${weight} ${size}px ${FONT}`; ctx.letterSpacing = `${track * size}px`; return ctx.measureText(s).width; };
const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w) + 1, Math.round(h) + 1); };
const circle = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, 7); ctx.fill(); };

const COLW = (W - 192 - 11 * 24) / 12;
const colX = i => 96 + i * (COLW + 24);       // left edge of column i (0..11)

// ---------- world (pages) ----------
function grid(t, k) {
  // 12 column edges; page 0 grows from the dot, the last page retracts toward the ring
  for (let i = 0; i < 12; i++) for (const side of [0, 1]) {
    const x = colX(i) + side * COLW; let a = 0, b = H;
    if (k === 0) { const d = Math.abs(x - 1398) / 900; const g = seg(t, .5 + d * .5, 1.0 + d * .5); const cy = 470; a = cy - cy * g; b = cy + (H - cy) * g; }
    if (k === 5) { const d = Math.abs(x - 1398) / 900; const g = 1 - seg(t, 17.0 + d * .6, 17.6 + d * .6); const cy = 470; a = cy - cy * g; b = cy + (H - cy) * g; }
    if (b - a < 1) continue;
    rect(x - .5, a, 1, b - a, C.g1);
  }
}
function artifact(t, k) {
  const ox = k * W;
  ctx.save(); ctx.translate(ox, 0);
  if (k === 0) {
    txt('ø 340 / 1 cherry', colX(6), 880, 19, 500, C.g3);
    const o = seg(t, 1.2, 1.6); rect(colX(6), 902, o * (colX(11) + COLW - colX(6)), 1, C.ink);
  }
  if (k === 1) {
    const a = seg(t, 3.7, 4.4), n = 35;
    for (let c = 0; c < 7; c++) for (let r = 0; r < 5; r++) {
      const i = r * 7 + c, on = seg(t, 3.0 + i * .02, 3.5 + i * .02 + .25) ; if (c === 3 && r === 2) continue;
      circle(1398 + 110 * (c - 3), 470 + 110 * (r - 2), 24 * E(on), C.g2);
    }
    if (t > 5.0) { ctx.strokeStyle = C.g2; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(1398, 470, 24, 0, 7); ctx.stroke(); }
    txt('7 × 5 trees / 1 picked', colX(6), 880, 19, 500, C.g3); rect(colX(6), 902, W * 0 + (colX(11) + COLW - colX(6)), 1, C.ink);
  }
  if (k === 2) {
    const e = seg(t, 6.5, 7.3);
    for (let i = 0; i < 5; i++) {
      const sx = 1398 + 170 * (i - 2) - 65, h = 160 * E(seg(t, 6.4 + i * .1, 7.0 + i * .1));
      rect(sx, 700 - h, 130, h, C.ink);
      rect(sx + 24, 700 - h + 28, 82, 1, C.g3);
    }
    // sack 3 gets its stripe when the bean lands
    if (t > 8.9) rect(1398 - 65, 700 - 160 + 56, 130, 10, C.ink);
    txt('dry / hull / bag', colX(6), 880, 19, 500, C.g3); rect(colX(6), 902, colX(11) + COLW - colX(6), 1, C.ink);
  }
  if (k === 3) {
    const e = seg(t, 9.0, 9.6);
    for (let i = 0; i < 12; i++) { const y = 620 + i * 24; rect(colX(6), y, (colX(11) + COLW - colX(6)) * E(seg(t, 9.0 + i * .03, 9.5 + i * .03)), 1, C.g2); }
    // container moves linearly with the exception
    const s = seg(t, 10.0, 12.2); const cx = 1398 + (1726 - 1398) * s;
    rect(cx - 150, 560, 300, 60, C.ink);
    for (let i = 1; i < 5; i++) rect(cx - 150 + i * 60, 566, 1, 48, C.g3);
    const off = t >= 10.0;
    txt(off ? `x ${Math.round(lerp(1398, 1726, s))}  off grid` : 'x 1398  on grid', colX(6), 880, 19, 500, off ? C.ink : C.g3);
    rect(colX(6), 902, colX(11) + COLW - colX(6), 1, C.ink);
  }
  if (k === 4) {
    const x0 = 1062, n = 25; const bx = 1734;
    for (let i = 0; i < n; i++) { const o = E(seg(t, 12.4 + i * .008, 12.9 + i * .008)); rect(x0 + i * 28, 600, 2, (i % 6 === 0 ? 52 : 28) * o, C.ink); }
    rect(x0, 600, 24 * 28 + 2, 1, C.ink);
    txt('light', x0, 690, 19, 500, C.g3); txt('dark', bx, 690, 19, 500, C.g3, 'right');
    txt('roast / 25 ticks', colX(6), 880, 19, 500, C.g3); rect(colX(6), 902, colX(11) + COLW - colX(6), 1, C.ink);
  }
  if (k === 5) {
    const g = E(seg(t, 15.0, 15.5)); const rr = 200, th = 34;
    const sw = seg(t, 15.5, 16.0) ;     // ring closes by a sweep
    ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = th; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.arc(1398, 470, rr - th / 2 + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * E(sw)); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}
function numeral(t, k) {
  const ox = k * W; const s = k === 0 ? 0 : 1;
  const a = k === 0 ? 0.0 : LAND[k] - .5, st = seg(t, k === 0 ? 0.1 : a, k === 0 ? .6 : a + .5);
  const n = String(k + 1).padStart(2, '0'); const size = 300;
  ctx.save(); ctx.beginPath(); ctx.rect(ox + 96, 90, 800, 270); ctx.clip();
  const lb = 0.055 * size; // optical flush-left (subtract left bearing)
  txt(n, ox + 96 - lb, 360 + (1 - E(st)) * 300, size, 900, C.ink, 'left', -.02);
  ctx.restore();
  txt(LEAD[k], ox + 98, 120, 19, 500, C.g3); rect(ox + 96, 90, colX(5) + COLW - 96, 1, C.ink);
}

// ---------- statement layer (screen space, subtitle = layout) ----------
function wrap(s, size, weight, maxW) {
  const ws = s.split(' '), rows = []; let cur = '';
  for (const w of ws) { const tr = cur ? cur + ' ' + w : w; if (meas(tr, size, weight, -.02) > maxW && cur) { rows.push(cur); cur = w; } else cur = tr; }
  rows.push(cur); return rows;
}
const BIG = 84, SMALL = 28, MAXW = colX(5) + COLW - 96;
const TEXTBOX = {};
function statements(t) {
  const boxes = [];
  LINES.forEach((L, k) => {
    const nextT = k < 5 ? LINES[k + 1].t : 1e9, next2 = k < 4 ? LINES[k + 2].t : 1e9;
    const endBig = nextT, endAll = next2 + (k < 4 ? 0 : 0);
    const lastHold = k === 5;
    if (t < L.t - .05 || (t > endAll + .3 && !lastHold)) return;
    const full = L.text;
    if (t < endBig - .0 || lastHold) {
      // big statement, word by word clip-reveal
      const rows = wrap(full, BIG, 700, MAXW); let wi = 0;
      const y0 = 590 + (0);
      const out = lastHold ? 0 : seg(t, nextT, nextT + .3);        // shrinks to a caption row
      if (out <= 0) {
        rows.forEach((row, ri) => {
          ctx.save(); ctx.beginPath(); ctx.rect(0, y0 + ri * 100 - 78, 1000, 104); ctx.clip();
          let x = 96; const ws = row.split(' ');
          ws.forEach((w, i) => {
            const wt = L.words[wi++].t; const u = E(seg(t, wt, wt + .35));
            txt(w, x, y0 + ri * 100 + (1 - u) * 110, BIG, 700, C.ink, 'left', -.02);
            x += meas(w + ' ', BIG, 700, -.02);
          });
          ctx.restore();
        });
        const rh = rows.length * 100;
        boxes.push({ id: 's' + k, text: full, x0: 96, y0: y0 - BIG, x1: 96 + MAXW, y1: y0 - BIG + rh });
        return;
      }
    }
    // caption stage: small grey, same text, above the new statement
    const inT = seg(t, nextT, nextT + .3), leave = seg(t, next2, next2 + .3);
    if (leave >= 1) return;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 400, 1000, 70); ctx.clip();
    txt(full, 96, 440 - E(leave) * 60, SMALL, 500, C.g3, 'left', -.01);
    ctx.restore();
    boxes.push({ id: 's' + k, text: full, x0: 96, y0: 410, x1: 96 + meas(full, SMALL, 500, -.01), y1: 450 });
  });
  return boxes;
}

// ---------- journey strip ----------
function strip(t) {
  const y = 966, h = 8, wCell = (W - 192 - 5 * 24) / 6;
  for (let i = 0; i < 6; i++) {
    const x = 96 + i * (wCell + 24); const p = clamp(page(t) - i + 1);
    rect(x, y, wCell, h, C.g1);
    if (p > 0) rect(x, y, wCell * (i === 5 ? clamp(seg(t, 15.0, 20)) * 0 + p : p), h, C.ink);
    txt(NAMES[i], x, y + 36, 17, 500, p >= 1 || Math.round(page(t)) === i ? C.ink : C.g3);
  }
}

// ---------- dot + ring/cup ----------
function drawDot(t) {
  const d = dot(t); if (t < .3 - .25) return;
  if (d.sq > 0.01 && t < 15.5) {                        // bean: squashed ellipse with a centre cut
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(-.5 * d.sq);
    ctx.fillStyle = C.sig; ctx.beginPath(); ctx.ellipse(0, 0, d.r, d.r * lerp(1, .64, d.sq), 0, 0, 7); ctx.fill();
    ctx.fillStyle = C.page; ctx.fillRect(-d.r, -1.5, d.r * 2 * .0 + d.r * 2, 3);   // centre cut
    ctx.restore();
    // ink wipe over the bean (roast)
  } else circle(d.x, d.y, d.r, C.sig);
  if (d.ink > 0 && t < 15.5 || (t >= 15.5 && d.ink > 0)) {
    // ink wipes in from the left across the dot
    const w = t >= 15.5 ? 1 : d.ink; ctx.save(); ctx.beginPath(); ctx.rect(d.x - d.r - 4, d.y - d.r - 4, (2 * d.r + 8) * w, 2 * d.r + 8); ctx.clip();
    ctx.fillStyle = C.ink;
    if (d.sq > .01 && t < 15.5) { ctx.translate(d.x, d.y); ctx.rotate(-.5 * d.sq); ctx.beginPath(); ctx.ellipse(0, 0, d.r, d.r * lerp(1, .64, d.sq), 0, 0, 7); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  if (t >= 15.5) {
    // brewed: the coffee fills the disc, signal rises from the bottom (wipe)
    const f = seg(t, 16.3, 17.0); const r = d.r;
    if (f > 0) { ctx.save(); ctx.beginPath(); ctx.arc(d.x, d.y, r, 0, 7); ctx.clip(); ctx.fillStyle = C.sig; const hh = 2 * r * E(f); ctx.fillRect(d.x - r, d.y + r - hh, 2 * r, hh); ctx.restore(); }
  }
}

// ---------- frame ----------
function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = C.page; ctx.fillRect(0, 0, W, H);
  const cx = camX(t);
  const zoom = 1 + .22 * E(seg(t, 18.0, 19.0));
  ctx.save();
  // world layer
  ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-1398 - 0 * 0, -470);   // zoom about the ring
  ctx.translate(1398 - W / 2 + (zoom === 1 ? 0 : 0), 470 - H / 2); // (re-centre: identity at zoom 1)
  ctx.translate(-cx, 0);
  // identity correction so that zoom=1 shows the page at (0,0)
  ctx.restore();
  ctx.save();
  const ax = 1398, ay = 470;
  ctx.translate(ax, ay); ctx.scale(zoom, zoom); ctx.translate(-ax, -ay);
  ctx.save(); ctx.translate(-cx, 0);
  for (let k = 0; k < 6; k++) {
    if (Math.abs(k * W - cx) >= W) continue;
    ctx.save(); ctx.translate(k * W, 0); grid(t, k); ctx.restore();
    artifact(t, k);
  }
  ctx.restore();
  ctx.restore();
  // numerals (world)
  ctx.save(); ctx.translate(-cx, 0);
  for (let k = 0; k < 6; k++) if (Math.abs(k * W - cx) < W) numeral(t, k);
  ctx.restore();
  ctx.save(); ctx.translate(ax, ay); ctx.scale(zoom, zoom); ctx.translate(-ax, -ay); drawDot(t); ctx.restore();
  const boxes = statements(t); window.__boxes = boxes;
  strip(t);
}

// ---------- events for the mixer ----------
function buildEvents() {
  const ev = [];
  ev.push({ t: .3, type: 'thunk', g: 1.4 });
  for (let i = 0; i < 6; i++) ev.push({ t: .55 + i * .09, type: 'rule' });
  for (let k = 1; k < 6; k++) {
    ev.push({ t: LAND[k] - PANDUR, type: 'slide', g: 1.4 });
    ev.push({ t: LAND[k], type: 'knife', g: 1 });
    ev.push({ t: LAND[k] + .5, type: 'clack' });
    ev.push({ t: LAND[k] + 1.0, type: 'clackBig', g: .6 });
  }
  ev.push({ t: 5.0, type: 'snap' }); ev.push({ t: 7.0, type: 'snap' }); ev.push({ t: 8.5, type: 'thunk', g: .7 });
  for (let i = 0; i < 6; i++) ev.push({ t: 13.5 + i * .25, type: 'tick' });
  ev.push({ t: 15.5, type: 'thump', g: 1 }); ev.push({ t: 16.3, type: 'paper', g: .6 }); ev.push({ t: 18.0, type: 'knife', g: .5 });
  ev.push({ t: 10.0, type: 'glide', t1: 12.2 });
  LINES.forEach((L, k) => ev.push({ t: L.t, type: 'voice', id: 'l' + (k + 1) }));
  return ev;
}

window.DUR = DUR;
window.EV = buildEvents();
window.TEXTS = t => { render(t); const b = window.__boxes || []; return b; };
window.render = render;
window.READY = true;
