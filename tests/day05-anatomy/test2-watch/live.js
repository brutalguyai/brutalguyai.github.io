// Live part of the page. Runs after the kit, the model (model.mjs), makeDyn (dyn.mjs) and the setup constants.
const stage = document.querySelector(".iso-stage");
const svgEl = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const blurbEl = document.querySelector("[data-blurb]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const slots = {};
for (const id of ORDER) slots[id] = svgEl.querySelector(`[data-slot="${id}"]`);
const dynEls = {};
svgEl.querySelectorAll("[data-dyn]").forEach((el) => { dynEls[el.dataset.dyn] = el; });
const SHORT = {
  case: "Case middle · stays put",
  caseback: "Caseback · sapphire window",
  rotor: "Rotor · winds the mainspring",
  bridges: "Bridges · hold the pivots",
  train: "Going train · barrel 8 h, centre 1 h, fourth 60 s",
  escape: "Balance · 3 Hz · 6 beats/s",
  plate: "Mainplate · carries the jewels",
  motion: "Motion works · 12 : 1",
  dial: "Dial · 12 indices, sub-seconds",
  hands: "Hands · one train drives all three",
  crystal: "Crystal · glass, edges only",
};
const RATES = [
  { label: "×1/6", rate: 1 / 6 },
  { label: "real time", rate: 1 },
  { label: "×600", rate: 600 },
];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ease = (t) => t * t * (3 - 2 * t);

let tw = 0, rateIx = 0, eNow = 0, eGoal = 0, focus = null, hoverFocus = null;
let rotorA = 0.6, rotorW = 0.4, lastX = null;
let last = 0, frame = 0, visible = false, idleAt = performance.now(), touring = !still.matches, tour = 0;
const fshare = {};
const cache = {};
const tf = {};

function put(name, key, make) {
  if (cache[name] === key) return;
  cache[name] = key;
  const el = dynEls[name];
  if (el) el.innerHTML = make();
}
const q = (v) => (Math.round(v * 2000) / 2000).toFixed(4);

function place() {
  for (const a of ASM) {
    const t = clamp((eNow - a.rank * 0.09) / (1 - 0.36), 0, 1);
    const share = ease(t);
    const f = (fshare[a.id] = fshare[a.id] ?? 0);
    // the layers that cover the one you point at slide out of the way (up the stack),
    // and in the lower stack the layer itself slides out sideways
    const lx = share * a.lean + a.tower * SLIDE * f * share;
    const dz = share * a.dz;
    const value = translateAlong(P, [lx * SIDE[0], lx * SIDE[1], dz]);
    if (tf[a.id] !== value) {
      tf[a.id] = value;
      slots[a.id].setAttribute("transform", value);
    }
  }
}

function drawTime() {
  const lapse = RATES[rateIx].rate > 50;
  const esc = escapement(tw, lapse);
  const ang = train(esc.beats);
  for (let i = 0; i < 5; i++) {
    const key = ["barrel", "center", "third", "fourth", "escape"][i];
    put("arbor" + i, q(ang[key]), () => dyn.arbor(i, ang));
  }
  put("motion", q(ang.center) + q(ang.hour), () => dyn.motion(ang));
  put("hands", q(ang.center) + q(ang.fourth) + q(ang.hour), () => dyn.hands(ang.hour + HOUR_HAND_OFFSET, ang.center, ang.fourth));
  put("balUnder", q(esc.balance), () => dyn.balanceUnder(esc.balance));
  put("balOver", q(esc.balance), () => dyn.balanceOver(esc.balance));
  put("fork", q(esc.fork), () => dyn.fork(esc.fork));
  put("rotor", q(rotorA), () => dyn.rotor(rotorA));
  return hms(tw);
}

let shown = "";
function say(text) {
  if (text !== shown) {
    shown = text;
    readout.textContent = text;
  }
}
let blurbShown = "";
function describe(id) {
  const text = id ? BLURBS[id] : "Point at a layer to read what it does. Sweep across the figure to take the watch apart.";
  if (text !== blurbShown && blurbEl) {
    blurbShown = text;
    blurbEl.textContent = text;
  }
}

function tourStep(dt) {
  tour += dt;
  const seq = ["case", ...ORDER.slice().reverse()];
  const hold = 1.2, open = 2.6, per = 2.0, close = 2.6;
  const total = hold + open + per * seq.length + close;
  const t = tour % total;
  if (t < hold) { eGoal = 0; focus = null; }
  else if (t < hold + open) { eGoal = ease((t - hold) / open); eNow = eGoal; focus = null; }
  else if (t < hold + open + per * seq.length) {
    eGoal = 1;
    eNow = 1;
    focus = seq[Math.floor((t - hold - open) / per)];
    if (focus === "case") focus = null;
  } else { eGoal = 1 - ease((t - hold - open - per * seq.length) / close); eNow = eGoal; focus = null; }
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (!calm && touring && now - idleAt > 3600) tourStep(dt);
  else if (!touring || now - idleAt <= 3600) tour = 0;
  if (!(touring && now - idleAt > 3600)) {
    eNow = calm ? eGoal : eNow + (eGoal - eNow) * (1 - Math.exp(-dt / 0.22));
    if (Math.abs(eGoal - eNow) < 0.0005) eNow = eGoal;
  }
  const f = hoverFocus ?? focus;
  const fa = ASM.find((x) => x.id === f);
  for (const a of ASM) {
    let want = 0;
    if (fa) want = fa.tower === 1 ? (a.tower === 1 && a.rank > fa.rank ? 1 : 0) : a.id === fa.id ? 1 : 0;
    const cur = fshare[a.id] ?? 0;
    fshare[a.id] = calm ? want : cur + (want - cur) * (1 - Math.exp(-dt / 0.2));
    if (Math.abs(fshare[a.id] - want) < 0.002) fshare[a.id] = want;
  }
  if (!calm) {
    tw += dt * RATES[rateIx].rate;
    rotorW += (0.3 - rotorW) * (1 - Math.exp(-dt / 2.5));
    rotorA += rotorW * dt;
  }
  place();
  const clock = drawTime();
  say(f ? SHORT[f] : `${clock} · 6 beats/s · ${RATES[rateIx].label}`);
  describe(f);
  stage.setAttribute("aria-valuenow", String(Math.round(eNow * 100)));
  stage.setAttribute("aria-valuetext", f ? BLURBS[f] : `${Math.round(eNow * 100)}% apart, ${clock}`);
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const poke = () => { idleAt = performance.now(); touring = true; };

new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);

stage.addEventListener("pointermove", (event) => {
  poke();
  const box = svgEl.getBoundingClientRect();
  const fx = (event.clientX - box.left) / box.width;
  eGoal = clamp((fx - 0.14) / 0.72, 0, 1);
  const hit = event.target.closest && event.target.closest("[data-asm]");
  hoverFocus = hit ? hit.dataset.asm : null;
  if (lastX !== null) rotorW = clamp(rotorW + (event.clientX - lastX) * 0.012, -9, 9);
  lastX = event.clientX;
  run();
});
stage.addEventListener("pointerleave", () => { hoverFocus = null; lastX = null; poke(); });
stage.addEventListener("click", () => { poke(); rateIx = (rateIx + 1) % RATES.length; run(); });
stage.addEventListener("keydown", (event) => {
  poke();
  const ids = ["case", ...ORDER];
  const at = focus ? ids.indexOf(focus) : -1;
  if (event.key === "ArrowRight") eGoal = clamp(eGoal + 0.25, 0, 1);
  else if (event.key === "ArrowLeft") eGoal = clamp(eGoal - 0.25, 0, 1);
  else if (event.key === "ArrowUp") focus = ids[(at + 1) % ids.length];
  else if (event.key === "ArrowDown") focus = ids[(at - 1 + ids.length) % ids.length];
  else if (event.key === "Escape") focus = null;
  else if (event.key === " " || event.key === "Enter") rateIx = (rateIx + 1) % RATES.length;
  else if (event.key === "Home") eGoal = 0;
  else if (event.key === "End") eGoal = 1;
  else return;
  event.preventDefault();
  run();
});

if (still.matches) { touring = false; eGoal = 0; }
describe(null);
place();
drawTime();
