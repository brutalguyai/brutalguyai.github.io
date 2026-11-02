// Pure model of the watch. Everything the figure shows (angles, tooth counts, rates)
// comes from here, in the page as at build time.
// Plan frame: x to 3 o'clock, y to 6 o'clock, angles measured from +x toward +y,
// which is clockwise as seen from the dial side. 12 o'clock is -y.

export const BEATS_PER_HOUR = 21600;
export const BEAT_RATE = BEATS_PER_HOUR / 3600; // 6 beats per second
export const BALANCE_HZ = BEAT_RATE / 2; // 3 full swings per second
export const AMPLITUDE = (270 * Math.PI) / 180; // balance swing, each side of rest
export const IMPULSE = 0.16; // share of a beat the fork and escape wheel take to move

export const M_TRAIN = 0.6; // module of the going train
export const MOD = 0.6;

// teeth: wheel / pinion on each arbor
export const T = {
  barrel: 80,
  centerPinion: 10,
  centerWheel: 60,
  thirdPinion: 8,
  thirdWheel: 64,
  fourthPinion: 8,
  fourthWheel: 72,
  escapePinion: 6,
  escapeWheel: 15,
  cannon: 10,
  minuteWheel: 30,
  minutePinion: 8,
  hourWheel: 32,
};

export const pitchR = (n, m = MOD) => (n * m) / 2;

// positions in the plan
export const POS = {
  center: [0, 0],
  barrel: [-19.1, -19.1],
  third: [-16.5, 12.03],
  fourth: [0, 26],
  escape: [18.7, 40.0],
  pallet: [28.5, 34.5],
  balance: [40, 28],
  minute: [-9.6, -7.2],
  rotor: [0, 0],
};

// ratios of every arbor to the escape wheel (signed: negative is opposite)
export const RATIO = (() => {
  const e = 1;
  const f = -e * (T.escapePinion / T.fourthWheel); // fourth wheel drives the escape pinion
  const th = -f * (T.fourthPinion / T.thirdWheel);
  const c = -th * (T.thirdPinion / T.centerWheel);
  const b = -c * (T.centerPinion / T.barrel);
  return { escape: e, fourth: f, third: th, center: c, barrel: b };
})();

// phase for B's tooth zero when A (angle thA) drives B across direction phi (A to B)
export const meshAngle = (thA, nA, nB, phi) => phi + Math.PI + Math.PI / nB - (nA / nB) * (thA - phi);

const dir = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);

// Starting phases: every wheel has tooth zero at its arbor angle; each pinion gets the
// offset that makes it mesh with its driver. Arbor angles at t = 0 are the base.
export const START_TIME = 10 * 3600 + 8 * 60 + 36; // 10:08:36
const a12 = -Math.PI / 2;
const minuteAngle0 = a12 + ((8 * 60 + 36) / 3600) * 2 * Math.PI;

export const BASE = (() => {
  const base = { center: minuteAngle0, barrel: 0.3, third: 0.1, fourth: a12 + (36 / 60) * 2 * Math.PI, escape: 0.2 };
  // pinion offsets (pinion tooth zero minus arbor angle), so that they mesh at t = 0
  const off = {};
  off.centerPinion = meshAngle(base.barrel, T.barrel, T.centerPinion, dir(POS.barrel, POS.center)) - base.center;
  off.thirdPinion = meshAngle(base.center, T.centerWheel, T.thirdPinion, dir(POS.center, POS.third)) - base.third;
  off.fourthPinion = meshAngle(base.third, T.thirdWheel, T.fourthPinion, dir(POS.third, POS.fourth)) - base.fourth;
  off.escapePinion = meshAngle(base.fourth, T.fourthWheel, T.escapePinion, dir(POS.fourth, POS.escape)) - base.escape;
  // motion works: cannon pinion rides the centre arbor, the minute wheel sits beside it
  const mw0 = -base.center / 3 + 0.4;
  off.minutePinion = 0;
  const cannonOff = 0;
  const minuteWheelBase = meshAngle(base.center + cannonOff, T.cannon, T.minuteWheel, dir(POS.center, POS.minute));
  const hourBase = meshAngle(minuteWheelBase, T.minutePinion, T.hourWheel, dir(POS.minute, POS.center));
  return { ...base, off, minuteWheelBase, hourBase, mw0 };
})();

// The oscillator. tw is watch time in seconds since START_TIME.
export function escapement(tw, lapse = false) {
  const phase = 2 * Math.PI * BALANCE_HZ * tw; // balance phase
  const balance = AMPLITUDE * Math.sin(phase);
  const beats = BEAT_RATE * tw; // beats since start
  const n = Math.floor(beats + 1e-9);
  const f = beats - n;
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const step = Math.min(1, f / IMPULSE);
  // fork alternates side each beat; wheel advances 12 degrees per beat (a tooth per two beats)
  const side = n % 2 === 0 ? 1 : -1;
  const fork = (side * (1 - 2 * (1 - ease(step)))) * (12 * Math.PI) / 180 * 0.6;
  const wheelSteps = lapse ? beats : n + ease(step);
  return { balance, beats: wheelSteps, rawBeats: beats, fork };
}

export const ESCAPE_STEP = (12 * Math.PI) / 180; // wheel turn per beat, anticlockwise from the dial

// Every arbor angle at a given beat count (steps or continuous).
export function train(beatsDone) {
  const dE = -ESCAPE_STEP * beatsDone; // escape wheel runs anticlockwise from the dial
  const ang = {
    escape: BASE.escape + dE * RATIO.escape,
    fourth: BASE.fourth + dE * RATIO.fourth,
    third: BASE.third + dE * RATIO.third,
    center: BASE.center + dE * RATIO.center,
    barrel: BASE.barrel + dE * RATIO.barrel,
  };
  ang.minuteWheel = BASE.minuteWheelBase - (ang.center - BASE.center) * (T.cannon / T.minuteWheel);
  ang.hour = BASE.hourBase - (ang.minuteWheel - BASE.minuteWheelBase) * (T.minutePinion / T.hourWheel);
  return ang;
}

export const hms = (tw) => {
  const s = Math.floor(START_TIME + tw);
  const h = Math.floor(s / 3600) % 12 || 12;
  const m = Math.floor(s / 60) % 60;
  const sec = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return `${h}:${p(m)}:${p(sec)}`;
};

// Rates, for the readout and captions
export const FACTS = {
  barrelHours: (2 * Math.PI) / Math.abs(RATIO.barrel * ESCAPE_STEP * BEAT_RATE) / 3600,
  centerHours: (2 * Math.PI) / Math.abs(RATIO.center * ESCAPE_STEP * BEAT_RATE) / 3600,
  fourthSeconds: (2 * Math.PI) / Math.abs(RATIO.fourth * ESCAPE_STEP * BEAT_RATE),
  escapeRpm: (60 * ESCAPE_STEP * BEAT_RATE) / (2 * Math.PI),
  hourHours: (2 * Math.PI) / Math.abs((RATIO.center * ESCAPE_STEP * BEAT_RATE * (T.cannon / T.minuteWheel) * (T.minutePinion / T.hourWheel)) * 1) / 3600,
};

// Heights of every part in the assembled watch (world z, 1 unit is about half a millimetre).
export const Z = {
  caseback: [-2.5, 2.5],
  rotor: [0.6, 2.0],
  bridges: [3.0, 1.8],
  level: (i) => 5.4 + 1.8 * i,
  wheel: 1.3,
  stubLow: 4.9,
  stubHigh: 15.2,
  plate: [14.6, 2.0],
  motion: 17.2,
  dial: [20.4, 1.4],
  hand: { second: 22.4, hour: 22.4, minute: 23.3 },
  crystal: [25.6, 3.0],
  ring: [0, 29],
};
export const HOUR_HAND_OFFSET = (() => {
  const want = -Math.PI / 2 + ((10 + (8 * 60 + 36) / 3600) / 12) * 2 * Math.PI;
  return want - BASE.hourBase;
})();
