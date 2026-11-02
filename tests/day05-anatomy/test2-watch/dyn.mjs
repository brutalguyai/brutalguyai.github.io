// Parts whose shape changes every frame. One source, used at build time (Node) and in the page.
// K is the kit (iso, extrude, cylinder, onTop, ring, solidSvg, lineSvg, dotsSvg), P the projection,
// M the model module (POS, T, Z, MOD, ...).
export function makeDyn(K, P, M) {
  const { iso, extrude, cylinder, onTop, ring, solidSvg, lineSvg, dotsSvg } = K;
  const { POS, T, Z, MOD } = M;
  const TAU = Math.PI * 2;
  const S = (paths, style) => solidSvg(paths, style);
  const L = (d, style) => lineSvg(d, style);
  const D = (points, style) => dotsSvg(points, style);
  const at = (x, y, z) => iso([x, y, z], P);
  const pol = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const rotate = (points, a, cx, cy) => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return points.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
  };
  const arcPts = (cx, cy, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => pol(cx, cy, r, a0 + ((a1 - a0) * i) / n));

  function toothRing(N, r, m, a0, cx, cy, kind = "spur") {
    const p = TAU / N;
    const rr = r - 1.25 * m;
    const ra = r + m;
    const out = [];
    for (let i = 0; i < N; i++) {
      const a = a0 + i * p;
      if (kind === "escape") {
        out.push(pol(cx, cy, rr, a + 0.5 * p), pol(cx, cy, ra, a), pol(cx, cy, ra, a - 0.1 * p), pol(cx, cy, rr, a - 0.2 * p));
      } else if (kind === "ratchet") {
        out.push(pol(cx, cy, rr, a - 0.5 * p), pol(cx, cy, ra, a + 0.4 * p), pol(cx, cy, ra, a + 0.5 * p), pol(cx, cy, rr, a + 0.5 * p));
      } else {
        out.push(pol(cx, cy, rr, a - 0.3 * p), pol(cx, cy, ra, a - 0.14 * p), pol(cx, cy, ra, a + 0.14 * p), pol(cx, cy, rr, a + 0.3 * p));
      }
    }
    return out;
  }

  // a flat cut-out: paper fill and an edge, like a window in a wheel web
  const windowSvg = (points, z) => {
    const d = onTop(points, z, P, true);
    return S({ fill: d, outline: d, crease: "", top: "", shades: ["", "", "", ""] }, { flat: true, tone: "lo", crease: "none" });
  };

  function windows(cx, cy, rOuter, rHub, spokes, ang, z, width = 0.9) {
    const out = [];
    for (let i = 0; i < spokes; i++) {
      const a0 = ang + (i * TAU) / spokes;
      const a1 = a0 + TAU / spokes;
      const dO = width / rOuter;
      const dI = width / rHub;
      if (a1 - a0 - 2 * dI <= 0.05) continue;
      const pts = [...arcPts(cx, cy, rOuter, a0 + dO, a1 - dO, 7), ...arcPts(cx, cy, rHub, a1 - dI, a0 + dI, 4)];
      out.push(windowSvg(pts, z));
    }
    return out.join("");
  }

  // a toothed wheel standing on z, with an optional web
  function gear(cx, cy, N, ang, z, { h = Z.wheel, m = MOD, kind = "spur", spokes = 0, hub = 0, tone = "mid", bore = 0, rimIn = 2.0 } = {}) {
    const r = (N * m) / 2;
    const top = z + h;
    const out = [S(extrude(toothRing(N, r, m, ang, cx, cy, kind), z, h, P, { convex: false }), { tone, crease: "lo" })];
    if (spokes) {
      const rr = r - 1.25 * m - rimIn;
      out.push(windows(cx, cy, rr, hub, spokes, ang + 0.3, top));
      out.push(L(ring(cx, cy, rr, top, P, 48), { tone: "faint" }));
    }
    if (hub) out.push(L(ring(cx, cy, hub, top, P, 20), { tone: "lo" }));
    if (bore) out.push(L(ring(cx, cy, bore, top, P, 12), { tone: "mid" }));
    return out.join("");
  }

  // a round post
  const post = (cx, cy, r, z0, z1, tone = "mid") => S(cylinder(cx, cy, r, z0, z1 - z0, P, 14), { tone, crease: "none" });

  const [LEVEL, WH] = [Z.level, Z.wheel];

  // arbor k = 0 barrel, 1 centre, 2 third, 3 fourth, 4 escape
  function arbor(k, ang) {
    const out = [];
    const base = { 0: POS.barrel, 1: POS.center, 2: POS.third, 3: POS.fourth, 4: POS.escape }[k];
    const [cx, cy] = base;
    const key = ["barrel", "center", "third", "fourth", "escape"][k];
    const a = ang[key];
    const pinionOf = [null, "centerPinion", "thirdPinion", "fourthPinion", "escapePinion"][k];
    const wheelZ = LEVEL(k);
    const top = wheelZ + (k === 0 ? 1.7 : WH);
    out.push(post(cx, cy, k === 4 ? 0.55 : 0.7, Z.stubLow, k === 0 ? wheelZ : LEVEL(k - 1)));
    if (pinionOf) {
      const N = T[pinionOf];
      out.push(gear(cx, cy, N, a + M.BASE.off[pinionOf], LEVEL(k - 1), { tone: "hi", hub: 0 }));
      out.push(post(cx, cy, N * MOD * 0.5 - 0.7, LEVEL(k - 1) + WH, LEVEL(k - 1) + WH + 0.15, "mid"));
    }
    if (k === 0) {
      out.push(gear(cx, cy, T.barrel, a, wheelZ, { h: 1.7, tone: "mid", spokes: 0 }));
      const t = wheelZ + 1.7;
      // lid, hub and the mainspring seen through it
      out.push(L(ring(cx, cy, 20.6, t, P, 64), { tone: "lo" }));
      out.push(L(ring(cx, cy, 19.2, t, P, 64), { tone: "faint" }));
      const sp = [];
      for (let i = 0; i <= 150; i++) {
        const u = i / 150;
        sp.push(pol(cx, cy, 3.4 + (19.2 - 3.4) * u, a + u * TAU * 6.5));
      }
      out.push(L(onTop(sp, t, P), { tone: "faint" }));
      out.push(L(ring(cx, cy, 3.4, t, P, 20), { tone: "lo" }));
    } else {
      const spokes = k === 1 ? 4 : k === 2 ? 4 : k === 3 ? 4 : 0;
      const r = (T[["barrel", "centerWheel", "thirdWheel", "fourthWheel", "escapeWheel"][k]] * MOD) / 2;
      if (k === 4) {
        out.push(gear(cx, cy, T.escapeWheel, a, wheelZ, { h: WH, m: 0.8, kind: "escape", tone: "hi", spokes: 3, hub: 1.3, rimIn: 1.6, bore: 0 }));
      } else {
        out.push(gear(cx, cy, T[["", "centerWheel", "thirdWheel", "fourthWheel"][k]], a, wheelZ, { tone: "mid", spokes, hub: r * 0.2 + 0.4, bore: 0.8 }));
      }
    }
    if (k === 0) out.push(ratchet());
    out.push(post(cx, cy, k === 4 ? 0.55 : 0.7, top, Z.stubHigh));
    return out.join("");
  }

  // the barrel arbor's ratchet wheel and click do not turn with the drum
  function ratchet() {
    const [cx, cy] = POS.barrel;
    const z = LEVEL(1);
    const out = [S(extrude(toothRing(36, 9.6, 0.5, 0.2, cx, cy, "ratchet"), z, 1.2, P, { convex: false }), { tone: "hi", crease: "lo" })];
    out.push(windows(cx, cy, 6.2, 1.8, 3, 0.6, z + 1.2, 0.7));
    out.push(L(ring(cx, cy, 6.2, z + 1.2, P, 28), { tone: "faint" }));
    out.push(L(ring(cx, cy, 1.4, z + 1.2, P, 14), { tone: "mid" }));
    // click and its screw
    const click = [[cx + 8.6, cy - 5.6], [cx + 10.6, cy - 4.8], [cx + 10.2, cy - 8.6], [cx + 8.6, cy - 8.8]];
    out.push(S(extrude(click, z, 1.2, P), { tone: "mid" }));
    out.push(D([at(cx + 10, cy - 7.6, z + 1.2)], { size: 0.5 }));
    return out.join("");
  }

  // ---- escapement -------------------------------------------------------------
  const BAL = POS.balance;
  const PAL = POS.pallet;
  const toBal = Math.atan2(BAL[1] - PAL[1], BAL[0] - PAL[0]);
  const toEsc = Math.atan2(POS.escape[1] - PAL[1], POS.escape[0] - PAL[0]);
  const ZH = { hair: 10.6, roller: 11.0, rim: 12.0, arms: 12.0 };

  function hairspring(alpha) {
    const pts = [];
    const turns = 8.5;
    const N = 170;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const a = u * TAU * turns + alpha * (1 - u) * 0.85 + 0.6;
      const r = 2.2 + (9.6 - 2.2) * u * (1 + 0.1 * Math.sin(alpha) * (1 - u));
      pts.push(pol(BAL[0], BAL[1], r, a));
    }
    return L(onTop(pts, ZH.hair, P), { tone: "lit" });
  }

  function balanceUnder(alpha) {
    const out = [hairspring(alpha)];
    // the roller table with the impulse pin
    out.push(S(cylinder(BAL[0], BAL[1], 3.3, ZH.roller, 0.9, P, 24), { tone: "mid" }));
    const pinA = alpha + toBal + Math.PI;
    const [px, py] = pol(BAL[0], BAL[1], 2.3, pinA);
    out.push(S(cylinder(px, py, 0.75, ZH.roller + 0.9, 0.7, P, 10), { tone: "hi", lit: true }));
    return out.join("");
  }

  function balanceOver(alpha) {
    const [cx, cy] = BAL;
    const out = [];
    for (let i = 0; i < 3; i++) {
      const a = alpha + 0.4 + (i * TAU) / 3;
      const w = 0.85;
      const p0 = pol(cx, cy, 1.4, a);
      const p1 = pol(cx, cy, 12.4, a);
      const nx = -Math.sin(a) * w;
      const ny = Math.cos(a) * w;
      out.push(S(extrude([[p0[0] + nx, p0[1] + ny], [p1[0] + nx, p1[1] + ny], [p1[0] - nx, p1[1] - ny], [p0[0] - nx, p0[1] - ny]], ZH.arms, 0.8, P), { tone: "hi", lit: true }));
    }
    out.push(S(cylinder(cx, cy, 2.3, ZH.arms, 1.2, P, 20), { tone: "hi", lit: true }));
    out.push(L(ring(cx, cy, 1.0, ZH.arms + 1.2, P, 12), { tone: "lit" }));
    // timing screws on the rim
    const screws = [];
    for (let i = 0; i < 8; i++) screws.push(at(...pol(cx, cy, 13.2, alpha + (i * TAU) / 8 + 0.2), ZH.rim + 1.0));
    out.push(D(screws, { size: 0.55, tone: "hi" }));
    return out.join("");
  }

  // pallet fork rocking about its pivot
  function fork(beta) {
    const [cx, cy] = PAL;
    const out = [];
    const strip = (a, len, w, z) => {
      const nx = -Math.sin(a) * w;
      const ny = Math.cos(a) * w;
      const [ex, ey] = pol(cx, cy, len, a);
      return extrude([[cx + nx, cy + ny], [ex + nx, ey + ny], [ex - nx, ey - ny], [cx - nx, cy - ny]], z, 0.55, P);
    };
    const z = 13.95;
    const armA = toEsc + 0.62 + beta;
    const armB = toEsc - 0.62 + beta;
    const tail = toBal + beta;
    out.push(S(strip(tail, 9.4, 0.55, z), { tone: "hi", lit: true }));
    // the fork's horn: two prongs around the impulse pin
    for (const s of [-1, 1]) {
      const [ex, ey] = pol(cx, cy, 9.4, tail);
      const a = tail + s * 0.34;
      const [hx, hy] = pol(ex, ey, 2.0, a);
      const nx = -Math.sin(a) * 0.35;
      const ny = Math.cos(a) * 0.35;
      out.push(S(extrude([[ex + nx, ey + ny], [hx + nx, hy + ny], [hx - nx, hy - ny], [ex - nx, ey - ny]], z, 0.55, P), { tone: "hi", lit: true }));
    }
    for (const a of [armA, armB]) {
      out.push(S(strip(a, 9.6, 0.7, z), { tone: "hi", lit: true }));
      const [sx, sy] = pol(cx, cy, 9.6, a);
      out.push(S(cylinder(sx, sy, 0.95, z, 0.75, P, 10), { tone: "hi", lit: true }));
    }
    out.push(S(cylinder(cx, cy, 1.7, z, 0.8, P, 16), { tone: "hi", lit: true }));
    out.push(L(ring(cx, cy, 0.7, z + 0.8, P, 10), { tone: "lit" }));
    return out.join("");
  }

  // ---- hands ----------------------------------------------------------------
  const kite = (pts, a, cx, cy) => rotate(pts, a, cx, cy);
  const MIN = [[-10, 0], [-5.5, 1.3], [2, 1.7], [54, 0.4], [54, -0.4], [2, -1.7], [-5.5, -1.3]];
  const HOUR = [[-8, 0], [-4, 1.9], [9, 2.9], [28, 2.1], [37, 0], [28, -2.1], [9, -2.9], [-4, -1.9]];
  const insetKite = (pts, k) => pts.map(([x, y]) => [x * k[0], y * k[1]]);
  function hands(aHour, aMin, aSec) {
    const out = [];
    const [sx, sy] = POS.fourth;
    // seconds hand in the sub-dial
    const SEC = [[-4.2, 0], [-3.4, 0.5], [9.6, 0.25], [9.6, -0.25], [-3.4, -0.5]];
    out.push(S(extrude(rotate(SEC, aSec, sx, sy), Z.hand.second, 0.5, P), { tone: "hi", crease: "none" }));
    const [tx, ty] = pol(sx, sy, -3.6, aSec);
    out.push(S(cylinder(tx, ty, 1.2, Z.hand.second, 0.5, P, 12), { tone: "hi", crease: "none" }));
    out.push(S(cylinder(sx, sy, 1.1, Z.hand.second, 0.9, P, 12), { tone: "hi", crease: "none" }));
    // hour and minute hands
    out.push(S(extrude(rotate(HOUR, aHour, 0, 0), Z.hand.hour, 0.7, P, { bevel: 0.3 }), { tone: "hi" }));
    out.push(L(onTop(rotate([[6, 0], [11, 1.4], [27, 1.0], [32, 0], [27, -1.0], [11, -1.4]], aHour, 0, 0), Z.hand.hour + 0.7, P, true), { tone: "mid" }));
    out.push(S(extrude(rotate(MIN, aMin, 0, 0), Z.hand.minute, 0.7, P, { bevel: 0.3 }), { tone: "hi" }));
    out.push(L(onTop(rotate([[6, 0], [12, 0.9], [44, 0.3], [48, 0], [44, -0.3], [12, -0.9]], aMin, 0, 0), Z.hand.minute + 0.7, P, true), { tone: "mid" }));
    out.push(S(cylinder(0, 0, 3.0, Z.hand.minute, 0.9, P, 28), { tone: "hi" }));
    out.push(L(ring(0, 0, 1.3, Z.hand.minute + 0.9, P, 14), { tone: "mid" }));
    return out.join("");
  }

  // ---- motion works -------------------------------------------------------------
  function motion(ang) {
    const out = [];
    const [mx, my] = POS.minute;
    const z0 = Z.motion;
    const zH = z0 + 1.3;
    // minute wheel (low) and its pinion (high)
    out.push(post(mx, my, 0.7, z0 - 0.4, z0));
    out.push(gear(mx, my, T.minuteWheel, ang.minuteWheel, z0, { h: 1.1, tone: "mid", spokes: 3, hub: 2.2, rimIn: 1.4, bore: 0.7 }));
    out.push(gear(mx, my, T.minutePinion, ang.minuteWheel + 0.0, zH, { h: 1.1, tone: "hi" }));
    out.push(post(mx, my, 0.7, zH + 1.1, zH + 1.5));
    // cannon pinion on the centre arbor, with the hour wheel above it
    out.push(gear(0, 0, T.cannon, ang.center, z0, { h: 1.1, tone: "hi" }));
    out.push(post(0, 0, 1.9, z0 + 1.1, Z.dial[0] + 2.6, "mid"));
    out.push(gear(0, 0, T.hourWheel, ang.hour, zH, { h: 1.1, tone: "mid", spokes: 4, hub: 3.4, rimIn: 1.4 }));
    out.push(post(0, 0, 3.2, zH + 1.1, Z.dial[0] + 1.6, "mid"));
    out.push(L(ring(0, 0, 1.9, Z.dial[0] + 2.6, P, 14), { tone: "mid" }));
    return out.join("");
  }

  // ---- rotor ----------------------------------------------------------------------
  function rotor(a) {
    const R = 38;
    const r0 = 7.5;
    const pts = [...arcPts(0, 0, R, a, a + Math.PI, 40), ...arcPts(0, 0, r0, a + Math.PI, a, 12)];
    const z = Z.rotor[0];
    const h = Z.rotor[1];
    const out = [S(extrude(pts, z, h, P, { convex: false }), { tone: "hi", crease: "lo" })];
    for (const r of [15, 22, 29, 34]) out.push(L(onTop(arcPts(0, 0, r, a, a + Math.PI, 36), z + h, P), { tone: "faint" }));
    out.push(D([at(...pol(0, 0, 25, a + 0.5), z + h), at(...pol(0, 0, 25, a + 1.6), z + h), at(...pol(0, 0, 25, a + 2.7), z + h)], { size: 0.55 }));
    out.push(S(cylinder(0, 0, 6.6, z, h + 1.4, P, 32), { tone: "mid" }));
    out.push(L(ring(0, 0, 4.7, z + h + 1.4, P, 28), { tone: "lo" }));
    out.push(L(ring(0, 0, 2.2, z + h + 1.4, P, 16), { tone: "mid" }));
    out.push(D([at(0, 0, z + h + 1.4)], { size: 0.6, tone: "hi" }));
    return out.join("");
  }

  return { arbor, ratchet, balanceUnder, balanceOver, fork, hands, motion, rotor, gear, toothRing, pol, rotate, arcPts, windows, post };
}
