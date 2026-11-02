import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { kitScript } from "../.claude/skills/anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";
import { makeDyn } from "./dyn.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.WATCH_OUT || HERE;
const light = process.argv.includes("--light");
const theme = light ? "light" : "dark";

const WIDTH = 1100;
const HEIGHT = 720;
const AZ = 72;
const EL = 36;
const { POS, T, Z, MOD } = M;

// ---- the stack: bottom to top, each with how far it travels when the watch comes apart ----
// lean is a slide across the screen (a world direction square to the view), dz a lift.
const ASM = [
  { id: "caseback", name: "Caseback", r: 76, z0: -2.5, z1: 0, dz: -104, lean: 245, rank: 4, tower: -1 },
  { id: "rotor", name: "Rotor", r: 40, z0: 0.6, z1: 4, dz: -86, lean: 210, rank: 3, tower: -1 },
  { id: "bridges", name: "Bridges", r: 62, z0: 3, z1: 4.8, dz: -68, lean: 175, rank: 2, tower: -1 },
  { id: "train", name: "Going train", r: 66, z0: 4.9, z1: 15.2, dz: -50, lean: 140, rank: 1, tower: -1 },
  { id: "escape", name: "Balance and pallet", r: 56, z0: 4.9, z1: 15.2, dz: -32, lean: 105, rank: 0, tower: -1 },
  { id: "plate", name: "Mainplate", r: 66, z0: 14.6, z1: 16.6, dz: 37, lean: -22, rank: 0, tower: 1 },
  { id: "motion", name: "Motion works", r: 14, z0: 17.2, z1: 23, dz: 56, lean: -50, rank: 1, tower: 1 },
  { id: "dial", name: "Dial", r: 66, z0: 20.4, z1: 22.6, dz: 76, lean: -80, rank: 2, tower: 1 },
  { id: "hands", name: "Hands", r: 54, z0: 22.4, z1: 24.2, dz: 96, lean: -112, rank: 3, tower: 1 },
  { id: "crystal", name: "Crystal", r: 71, z0: 25.1, z1: 28.6, dz: 116, lean: -146, rank: 4, tower: 1 },
];
const SLIDE = 70; // extra slide of the layer you point at

const AZR = (AZ * Math.PI) / 180;
const SIDE = [Math.sin(AZR), -Math.cos(AZR)]; // world direction that is screen-right

const extremes = [];
for (const a of ASM) {
  for (const state of [0, 1]) {
    for (const slide of [0, a.tower * SLIDE * 0.5]) {
      const lx = state * (a.lean + slide);
      for (const z of [a.z0, a.z1]) {
        const zz = z + state * a.dz;
        for (const th of [0, 1.57, 3.14, 4.71]) extremes.push([Math.cos(th) * a.r + lx * SIDE[0], Math.sin(th) * a.r + lx * SIDE[1], zz]);
      }
    }
  }
}
extremes.push([0, 0, 0], [96, 0, 18], [0, 96, 18], [0, -96, 18]);
const P = k.fitProjection(extremes, WIDTH, HEIGHT, { pad: 22, azimuth: AZ, elevation: EL });

const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const at = (x, y, z) => k.iso([x, y, z], P);
const TAU = Math.PI * 2;
const pol = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const FZ = G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const band = (z0, z1, rIn, rOut, cx = 0, cy = 0) => G.ringBand(z0, z1, rIn, rOut, G.frameOf([cx, cy, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]), P, { hole: [z1, rIn] });
const arcPts = (cx, cy, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => pol(cx, cy, r, a0 + ((a1 - a0) * i) / n));
const dyn = makeDyn(k, P, M);

// a capsule (stadium) outline from p0 to p1
function capsule(p0, p1, r, n = 10) {
  const a = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
  return [...arcPts(p1[0], p1[1], r, a - Math.PI / 2, a + Math.PI / 2, n), ...arcPts(p0[0], p0[1], r, a + Math.PI / 2, a + (3 * Math.PI) / 2, n)];
}
const screw = (x, y, z, r = 1.3, a = 0.6) => [
  L(k.ring(x, y, r, z, P, 12), { tone: "lo" }),
  L(k.lineOnTop([x - Math.cos(a) * r * 0.75, y - Math.sin(a) * r * 0.75], [x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75], z, P), { tone: "mid" }),
].join("");
const jewel = (x, y, z) => L(k.ring(x, y, 2.3, z, P, 18), { tone: "mid" }) + L(k.ring(x, y, 1.1, z, P, 12), { tone: "lo" }) + D([at(x, y, z)], { size: 0.5, tone: "hi" });
const group = (id, inner) => `<g data-asm="${id}">${inner}</g>`;
const slot = (name, inner = "") => `<g data-dyn="${name}">${inner}</g>`;

// ---- state at rest ------------------------------------------------------------------------------
const esc0 = M.escapement(0);
const ang0 = M.train(esc0.beats);
const state0 = { ang: ang0, esc: esc0 };
const handAngles = (ang) => [ang.hour + M.HOUR_HAND_OFFSET, ang.center, ang.fourth];

// ---- the case middle (stays put) ---------------------------------------------------------------------
const RING = { rIn: 67.5, rOut: 78, z1: 29 };
const view = k.towardViewer(P);
const viewA = Math.atan2(view[1], view[0]);
const near = (r, z, n = 60) => arcPts(0, 0, r, viewA - Math.PI / 2, viewA + Math.PI / 2, n).map(([x, y]) => at(x, y, z));
const lugs = [];
for (const sx of [-1, 1]) for (const sy of [-1, 1]) lugs.push({ sx, sy, cx: sx * 26, y0: sy > 0 ? 70 : -98, front: sy > 0 });
const polyPath = (pts) => "M" + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") + "Z";

function caseBody() {
  const out = [];
  out.push(S(band(0, RING.z1, RING.rIn, RING.rOut), { tone: "mid" }));
  out.push(S(band(0, 2.6, 61, RING.rIn), { tone: "lo", crease: "none" }));
  out.push(L(k.ring(0, 0, 76.4, RING.z1, P, 96), { tone: "faint" }));
  out.push(L(k.ring(0, 0, 69.2, RING.z1, P, 96), { tone: "faint" }));
  out.push(L(k.sideArc(0, 0, RING.rOut, 24.6, P, 64), { tone: "faint" }));
  out.push(L(k.sideArc(0, 0, RING.rOut, 4.2, P, 64), { tone: "faint" }));
  const wall = G.ribsOf(FZ, 7.5, 21.5, RING.rOut, 72, P, { seams: false });
  out.push(L(Array.isArray(wall) ? wall.map((w) => w.d ?? w).join("") : wall, { tone: "faint" }));
  return out.join("");
}

function lugSvg(l) {
  const plan = { x: l.cx - 6, y: l.y0, w: 12, d: 28, r: 4.5 };
  const out = [S(k.slabOf(plan, 7, 12, P, 6, 0.6), { tone: "mid" })];
  out.push(L(k.planOutline(k.insetPlan(plan, 2), 19, P, 6), { tone: "faint" }));
  const hy = l.sy > 0 ? l.y0 + 22 : l.y0 + 6;
  out.push(D([at(l.cx - 6, hy, 12), at(l.cx + 6, hy, 12)].filter(() => true), { size: 0.5 }));
  return out.join("");
}

function crown() {
  const out = [];
  const F = G.frameOf([RING.rOut - 1, 0, 14], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  out.push(S(G.disc(0, 7, 1.5, F, P), { tone: "mid", crease: "none" }));
  const F2 = G.frameOf([RING.rOut + 5, 0, 14], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  out.push(S(G.disc(0, 8, 4.6, F2, P), { tone: "hi" }));
  const ribs = G.ribsOf(F2, 0.3, 7.7, 4.6, 22, P, { seams: true, fade: [0.05, 0.4] });
  out.push(Array.isArray(ribs) ? k.fadedSvg(ribs, { tone: "lo" }) : L(ribs, { tone: "lo" }));
  return out.join("");
}

const ringBack = () => `<g data-asm="case">${caseBody()}${lugs.filter((l) => !l.front).map(lugSvg).join("")}</g>`;
function ringFront() {
  const Ri = RING.rIn;
  const Ro = RING.rOut;
  const innerTop = near(Ri, RING.z1);
  const outerTop = near(Ro, RING.z1);
  const outerBottom = near(Ro, 0);
  const clip = polyPath([...innerTop, outerTop[outerTop.length - 1], ...[...outerBottom].reverse(), outerTop[0]]);
  return `<clipPath id="ringFront"><path d="${clip}"/></clipPath><g data-asm="case"><g clip-path="url(#ringFront)">${caseBody()}</g>${lugs.filter((l) => l.front).map(lugSvg).join("")}${crown()}</g>`;
}

// ---- caseback -----------------------------------------------------------------------------------------
function caseback() {
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: -74, y: -74, w: 148, d: 148, r: 74 }, -2.5, 2.5, P)}"/>`];
  out.push(S(band(-2.5, 0, 56.5, 74.5), { tone: "mid" }));
  out.push(S(band(0, 0.7, 63.4, 69.4), { tone: "lo", crease: "none" }));
  for (let i = 0; i < 6; i++) {
    const [x, y] = pol(0, 0, 72.2, i * (TAU / 6) + 0.26);
    out.push(screw(x, y, 0, 1.5, i));
  }
  // the sapphire window: edges only, so you see the rotor through it
  out.push(L(k.ring(0, 0, 56.5, 0, P, 96), { tone: "mid" }));
  out.push(L(k.ring(0, 0, 57.2, 0.5, P, 96), { tone: "faint" }));
  out.push(L(k.sideArc(0, 0, 74.5, -1.2, P, 64), { tone: "faint" }));
  return group("caseback", out.join(""));
}

// ---- rotor -------------------------------------------------------------------------------------------
const rotor = () => group("rotor", slot("rotor", dyn.rotor(0.6)));

// ---- bridges (under the wheels; seen from the dial side with the plate off) -------------------------------
function bridges() {
  const out = [];
  const z = Z.bridges[0];
  const h = Z.bridges[1];
  const cap = (p0, p1, r, tone = "mid") => {
    const ringPts = capsule(p0, p1, r);
    const s = S(k.extrude(ringPts, z, h, P, { bevel: 0.4 }), { tone });
    const inner = L(k.onTop(capsule(p0, p1, r - 1.5), z + h, P, true), { tone: "faint" });
    return s + inner;
  };
  const bb = [POS.barrel, [-5.6, -5.6]];
  out.push(cap(bb[0], bb[1], 9.2));
  out.push(jewel(POS.barrel[0], POS.barrel[1], z + h) + screw(-4.2, -4.2, z + h) + screw(POS.barrel[0] - 4.5, POS.barrel[1] - 4.5, z + h));
  out.push(S(k.cylinder(0, 0, 6.8, z, h, P, 28, 0.4), { tone: "mid" }));
  out.push(jewel(0, 0, z + h) + screw(0, 4.4, z + h) + screw(0, -4.4, z + h));
  const tb = [POS.third, POS.escape];
  out.push(cap(tb[0], tb[1], 6.0));
  out.push(jewel(POS.third[0], POS.third[1], z + h) + jewel(POS.fourth[0], POS.fourth[1], z + h) + jewel(POS.escape[0], POS.escape[1], z + h));
  out.push(screw(POS.third[0] - 3, POS.third[1] + 3.2, z + h) + screw(POS.escape[0] + 2.4, POS.escape[1] + 3.2, z + h));
  out.push(cap(POS.pallet, [POS.pallet[0] + 4, POS.pallet[1] + 3], 4.6));
  out.push(jewel(POS.pallet[0], POS.pallet[1], z + h) + screw(POS.pallet[0] + 4, POS.pallet[1] + 3.4, z + h, 1.0));
  // the balance cock, with the stud that holds the outer end of the hairspring
  const stud = pol(POS.balance[0], POS.balance[1], 9.6, 0.6 + 8.5 * TAU);
  out.push(cap(POS.balance, [stud[0] + 1, stud[1] - 1], 5.8));
  out.push(jewel(POS.balance[0], POS.balance[1], z + h) + screw(stud[0] + 1, stud[1] - 1, z + h, 1.1));
  out.push(S(k.cylinder(stud[0], stud[1], 0.95, z + h, 10.6 - z - h, P, 10), { tone: "hi", crease: "none" }));
  return group("bridges", out.join(""));
}

// ---- going train ------------------------------------------------------------------------------------------
function trainParts() {
  return group("train", [0, 1, 2, 3, 4].map((i) => slot(`arbor${i}`, dyn.arbor(i, ang0))).join(""));
}

// ---- balance, hairspring and pallet fork ------------------------------------------------------------------------
function escapeParts() {
  const out = [];
  const [bx, by] = POS.balance;
  const [px, py] = POS.pallet;
  out.push(S(k.cylinder(px, py, 0.6, Z.stubLow, 9.1, P, 10), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(bx, by, 0.7, Z.stubLow, 5.3, P, 12), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(bx, by, 2.2, 10.2, 0.4, P, 20), { tone: "mid", crease: "none" }));
  out.push(slot("balUnder", dyn.balanceUnder(esc0.balance)));
  out.push(S(band(12, 13, 12.3, 14.0, bx, by), { tone: "hi", lit: true }));
  out.push(L(k.ring(bx, by, 13.15, 13, P, 64), { tone: "lit" }));
  out.push(slot("balOver", dyn.balanceOver(esc0.balance)));
  out.push(S(k.cylinder(bx, by, 0.7, 13.2, 2.0, P, 12), { tone: "mid", crease: "none" }));
  out.push(slot("fork", dyn.fork(esc0.fork)));
  out.push(S(k.cylinder(px, py, 0.6, 14.5, 0.7, P, 10), { tone: "mid", crease: "none" }));
  return group("escape", out.join(""));
}

// ---- mainplate -------------------------------------------------------------------------------------------------
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: -66, y: -66, w: 132, d: 132, r: 66 }, Z.plate[0], Z.plate[1], P)}"/>`];
  const z = Z.plate[0];
  const top = z + Z.plate[1];
  out.push(S(k.cylinder(0, 0, 66, z, Z.plate[1], P, 96, 0.8), { tone: "mid" }));
  out.push(L(k.ring(0, 0, 62.5, top, P, 96), { tone: "faint" }));
  for (const r of [14, 26, 38, 50]) out.push(L(k.ring(0, 0, r, top, P, 72), { tone: "faint" }));
  out.push(L(k.sideArc(0, 0, 66, z + 1.1, P, 64), { tone: "faint" }));
  for (const key of ["barrel", "center", "third", "fourth", "escape", "pallet", "balance"]) out.push(jewel(POS[key][0], POS[key][1], top));
  for (let i = 0; i < 8; i++) {
    const [x, y] = pol(0, 0, 58.5, i * (TAU / 8) + 0.2);
    out.push(screw(x, y, top, 1.5, i * 0.7));
  }
  out.push(D([at(-36, -30, top), at(34, -34, top), at(-44, 20, top)], { size: 0.55 }));
  // a recess for the winding stem
  out.push(S(k.slabOf({ x: 44, y: -4, w: 18, d: 8, r: 2 }, top - 0.4, 0.4, P, 4), { tone: "lo", crease: "none", flat: true }));
  out.push(D([at(50, 0, top)], { size: 0.8, tone: "hi" }));
  out.push(k.faceTextSvg(k.topMatrix([0, -52], top, P, "x"), "AUTOMATIC CAL. 21600", { size: 2.4, tone: "lo", anchor: "middle" }));
  return group("plate", out.join(""));
}

// ---- motion works -------------------------------------------------------------------------------------------------
const motion = () => group("motion", slot("motion", dyn.motion(ang0)));

// ---- dial ------------------------------------------------------------------------------------------------------------
function dial() {
  const out = [];
  const z = Z.dial[0];
  const top = z + Z.dial[1];
  out.push(S(band(z, top, 3.6, 66), { tone: "hi" }));
  out.push(L(k.ring(0, 0, 63.4, top, P, 96), { tone: "lo" }));
  out.push(L(k.ring(0, 0, 59.4, top, P, 96), { tone: "lo" }));
  const ticks = k.radialTicks(0, 0, 63.4, 60, 5, top, [-2.0, -4.0], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  // applied indices
  for (let h = 0; h < 12; h++) {
    const a = -Math.PI / 2 + (h * TAU) / 12;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const rect = (r0, r1, w, off = 0) => [[r0, off - w], [r1, off - w], [r1, off + w], [r0, off + w]].map(([u, v]) => [u * c - v * s, u * s + v * c]);
    if (h % 3 === 0) {
      for (const off of h === 0 ? [-1.3, 1.3] : [0]) out.push(S(k.extrude(rect(45, 56.5, h === 0 ? 0.6 : 1.4, off), top, 0.8, P, { bevel: 0.2 }), { tone: "hi", lit: false }));
    } else {
      out.push(S(k.extrude(rect(48, 56.5, 1.0), top, 0.8, P), { tone: "hi" }));
    }
  }
  // seconds sub-dial
  const [sx, sy] = POS.fourth;
  out.push(L(k.ring(sx, sy, 12.4, top, P, 48), { tone: "mid" }));
  out.push(L(k.ring(sx, sy, 11.2, top, P, 48), { tone: "lo" }));
  const st = k.radialTicks(sx, sy, 11.2, 60, 5, top, [-1.0, -2.0], P);
  out.push(L(st.minor, { tone: "faint" }), L(st.major, { tone: "lo" }));
  out.push(L(k.ring(sx, sy, 1.4, top, P, 12), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([0, -30], top, P, "x"), "ANATOMY", { size: 4.2, tone: "hi", anchor: "middle" }));
  out.push(k.faceTextSvg(k.topMatrix([0, -23.5], top, P, "x"), "AUTOMATIC", { size: 2.2, tone: "lo", anchor: "middle" }));
  out.push(k.faceTextSvg(k.topMatrix([0, 46], top, P, "x"), "21,600 A/H", { size: 2.2, tone: "lo", anchor: "middle" }));
  return group("dial", out.join(""));
}

// ---- hands ----------------------------------------------------------------------------------------------------------------
const hands = () => group("hands", slot("hands", dyn.hands(...handAngles(ang0))));

// ---- crystal: glass, so it is drawn as edges only --------------------------------------------------------------------------
function crystal() {
  const out = [];
  const [z0, h] = Z.crystal;
  const top = z0 + h;
  out.push(S(band(z0 - 0.5, z0, 63, 70.6), { tone: "lo", crease: "none" }));
  out.push(L(k.ring(0, 0, 70, top, P, 120), { tone: "mid" }));
  out.push(L(k.ring(0, 0, 65.5, top, P, 120), { tone: "faint" }));
  out.push(L(near(70, z0).map((p, i) => (i ? "L" : "M") + p.map((v) => v.toFixed(1)).join(" ")).join(""), { tone: "mid" }));
  for (const sgn of [-1, 1]) {
    const [x, y] = pol(0, 0, 70, viewA + (sgn * Math.PI) / 2);
    out.push(L(k.rise([x, y], z0, top, P), { tone: "mid" }));
  }
  // glints on the glass
  const glint = (a0, a1, r) => arcPts(0, 0, r, a0, a1, 24).map(([x, y]) => at(x, y, top));
  out.push(k.fadeLineSvg(glint(3.5, 4.4, 58), { fade: [16, 16], tone: "mid" }));
  out.push(k.fadeLineSvg(glint(3.85, 4.15, 52), { fade: [8, 8], tone: "lo" }));
  return group("crystal", out.join(""));
}

// ---- the page --------------------------------------------------------------------------------------------------------------------
const order = ["caseback", "rotor", "bridges", "train", "escape", "plate", "motion", "dial", "hands", "crystal"];
const makers = { caseback, rotor, bridges, train: trainParts, escape: escapeParts, plate, motion, dial, hands, crystal };
const assembled = order.map((id) => `<g data-slot="${id}" transform="translate(0 0)">${makers[id]()}</g>`);
const body = [ringBack(), ...assembled, ringFront()];

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A mechanical automatic wristwatch taken apart in two stacks around its case. Above the case: the mainplate, motion works, dial, hands and crystal. Below it: the balance and pallet fork, the going train, the bridges, the winding rotor and the caseback. The balance wheel swings, the escape wheel steps and the hands turn from the same gear train.",
  body,
});

const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const dynSource = readFileSync(join(HERE, "dyn.mjs"), "utf8").replace(/^export /gm, "");
const liveSource = readFileSync(join(HERE, "live.js"), "utf8");

const blurbs = {
  case: `Case middle. Stays put while the rest comes out of it. ${lugs.length} lugs, a crown on the stem.`,
  caseback: "Caseback. A sapphire window over the rotor, six screws and a gasket.",
  rotor: "Rotor. A half-disc weight on a ball bearing: wrist motion swings it round and winds the mainspring.",
  bridges: "Bridges. Hold the pivots of the wheels from below. The balance cock carries the stud of the hairspring.",
  train: `Going train. Barrel ${T.barrel} drives pinion ${T.centerPinion}, centre wheel ${T.centerWheel} drives ${T.thirdPinion}, third ${T.thirdWheel} drives ${T.fourthPinion}, fourth ${T.fourthWheel} drives ${T.escapePinion}. Barrel ${M.FACTS.barrelHours} h per turn, centre ${M.FACTS.centerHours} h, fourth ${M.FACTS.fourthSeconds} s.`,
  escape: `Balance and pallet. The balance swings ±270° at ${M.BALANCE_HZ} Hz, so the fork flips ${M.BEAT_RATE} times a second; the ${T.escapeWheel}-tooth wheel advances 12° per beat.`,
  plate: "Mainplate. The base every pivot jewel sits in.",
  motion: `Motion works. Cannon pinion ${T.cannon}, minute wheel ${T.minuteWheel}/${T.minutePinion}, hour wheel ${T.hourWheel}: the hour hand turns 12 times slower than the minute hand.`,
  dial: "Dial. Twelve applied indices, a minute track and a seconds sub-dial on the fourth wheel.",
  hands: "Hands. Minute on the centre arbor, hour on the hour wheel, seconds on the fourth wheel.",
  crystal: "Crystal. A flat sapphire disc on a gasket; glass, so only its edges are drawn.",
};

const setup = `
const WIDTH = ${WIDTH}, HEIGHT = ${HEIGHT};
const P = ${JSON.stringify(P)};
const ASM = ${JSON.stringify(ASM)};
const SIDE = ${JSON.stringify(SIDE)};
const SLIDE = ${SLIDE};
const BLURBS = ${JSON.stringify(blurbs)};
const ORDER = ${JSON.stringify(order)};
const M = { POS, T, Z, MOD, BASE };
const K = { iso, extrude, cylinder, onTop, ring, solidSvg, lineSvg, dotsSvg };
const dyn = makeDyn(K, P, M);
`;

const html = k.plateHtml({
  fig: "Fig 1",
  title: "Automatic watch, taken apart",
  hint: "Sweep across to take it apart · point at a layer · Space changes speed",
  readout: `${M.hms(0)} · 6 beats/s · ×1/6`,
  keys: [
    { mark: "lit", label: "Balance wheel, hairspring and pallet fork: the part that keeps time" },
    { mark: "raised", label: "Every wheel, hand and bridge is drawn from the same tooth counts" },
    { mark: "edge", label: "Glass is drawn as edges only" },
  ],
  caption: `The balance swings ±270° at 3 Hz; each time it passes centre the pallet fork flips and the ${T.escapeWheel}-tooth escape wheel steps 12°. That is 6 beats a second, 21,600 an hour. The wheel train divides it to one turn a minute (fourth wheel, seconds hand) and one an hour (centre wheel, minute hand); the motion works divide that by 12 for the hour hand. Nothing else drives the hands.`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Watch: arrow left and right take it apart, up and down pick a layer, space changes the speed" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">${svg}</div>`,
});

const blurbCss = "<style>.wt-blurb{margin:14px 4px 2px;min-height:3.4em;color:var(--anatomy-text);font-size:13px;line-height:1.55}.iso-stage{outline:none}.iso-fill,.iso-top,.iso-shade{fill-rule:evenodd}</style>";
const withBlurb = blurbCss + html.replace("</div><figcaption", '</div><p class="wt-blurb" data-blurb aria-live="polite"></p><figcaption');
const script = kitScript() + "\n" + modelSource + "\n" + dynSource + "\n" + setup + "\n" + liveSource;
const file = join(OUT, light ? "automatic-watch-light.html" : "automatic-watch.html");
writeFileSync(file, k.pageHtml({ title: "Automatic watch, taken apart", theme, body: withBlurb, script, width: 1160 }));
console.log("wrote", file, `${(svg.length / 1024).toFixed(0)} KB svg`);
