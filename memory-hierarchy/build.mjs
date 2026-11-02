// Fig: a warehouse, a cart and a workbench: why softmax is memory-bound and matmul is not.
// node build.mjs            -> memory-hierarchy.html (light)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { kitScript } from "../.claude/skills/anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";
import { makeParts } from "./parts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--dark") ? "dark" : "light";
const WIDTH = 640, HEIGHT = 350;

// ---- world plan (units ~ px; x along the track, y toward the front, z up) ----
const BASE = { x: -226, y: -46, w: 408, d: 114, r: 9 };
const BASE_H = 12, FOOT_H = 5;
const RACK = { x0: -208, x1: -112, y0: -36, y1: 36, top: 150 }; // outer faces of the posts
const POST = 4;
const LEVELS = [46, 82, 118, 148]; // deck heights of the upper shelves (last is the roof)
const LANE_Y = [0, 22]; // raw crates ride lane 0, finished crates lane 1
const RAIL_Y = [-20, 27];
const TRACK = { x0: -112, x1: 67 };
const CART_X = [-94, 48]; // cart centre at the warehouse and at the bench
const BENCH = { x: 68, y: -40, w: 98, d: 80, r: 3 };
const BED_TOP = 11;
const TABLE = { c: [106, 0], r: 32, R: 22 };
const STATION = [Math.PI, Math.PI * 1.5, 0, Math.PI * 0.5]; // IN, STAGE, WORK, OUT
const COLUMN = [154, 0];
const HEAD = [128, 0];
const GAUGE_CART = { c: [-78, 52], r: 10, z: 14, h: 5 };
const GAUGE_WORK = { c: [156, 31], r: 7.5, z: 19, h: 4.5 };
const KNOB = [-14, 52];

const P = k.fitProjection(
  [...k.boxCorners(BASE, -BASE_H - FOOT_H, 0), [RACK.x0, RACK.y0, RACK.top + 2], [RACK.x1, RACK.y1, RACK.top + 2], [COLUMN[0], 0, 114]],
  WIDTH, HEIGHT, { pad: 34, azimuth: 70 },
);
const X = makeParts(k, P);
const { DECK } = X;
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const depth = (x, y, z = 0) => k.depthOf([x, y, z], P);
const byDepth = (pts) => [...pts].sort((a, b) => depth(a[0], a[1]) - depth(b[0], b[1]));
const slab = (plan, z, h, style = {}, steps = 3, bevel = 0) => S(k.slabOf(plan, z, h, P, steps, bevel), style);
const box = (x0, y0, x1, y1, z, h, style = {}, r = 0.6, bevel = 0) => slab({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z, h, style, 3, bevel);
const screws = (pts, style = {}) => D(pts.map(at), { size: 0.45, tone: "mid", ...style });

// ---- base plate ----
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`];
  const feet = [...k.corners(BASE, 24), [0, BASE.y + 24], [0, BASE.y + BASE.d - 24]];
  for (const [x, y] of byDepth(feet)) {
    out.push(S(k.cylinder(x, y, 7.5, -BASE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.8, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(BASE, -4, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: "lo" }));
  const corner = k.corners(BASE, 10);
  out.push(L(corner.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }), screws(corner.map(([x, y]) => [x, y, 0]), { size: 0.5 }));
  // ruler strip along the front of the track
  const strip = { x: -62, y: 36.5, w: 124, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.8], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }), screws([[strip.x + 2, strip.y + 3, 0.6], [strip.x + strip.w - 2, strip.y + 3, 0.6]]));
  // label plate
  const plate = { x: -212, y: 47, w: 46, d: 14, r: 1.2 };
  out.push(S(k.slabOf(plate, 0, 0.8, P, 4), { tone: "lo", crease: "faint" }), L(k.planOutline(k.insetPlan(plate, 1.6), 0.8, P, 4), { tone: "faint" }));
  out.push(L([[0, 30], [1.6, 22], [3.2, 26]].map(([dy, len]) => k.lineOnTop([plate.x + 5, plate.y + 4 + dy * 2], [plate.x + 5 + len, plate.y + 4 + dy * 2], 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(screws([[plate.x + plate.w - 3.4, plate.y + 3.4, 0.8], [plate.x + plate.w - 3.4, plate.y + plate.d - 3.4, 0.8]]));
  return out.join("");
}

// ---- the warehouse: a flow rack ----
const postAt = (x, y) => ({ x, y, w: POST, d: POST, r: 0.5 });
const POSTS = { lb: postAt(RACK.x0, RACK.y0), rb: postAt(RACK.x1 - POST, RACK.y0), lf: postAt(RACK.x0, RACK.y1 - POST), rf: postAt(RACK.x1 - POST, RACK.y1 - POST) };
const IX0 = RACK.x0 + POST, IX1 = RACK.x1 - POST; // inner span between posts
function post(plan, z0, z1, cap = true) {
  const holes = [];
  for (let z = z0 + 6; z < z1 - 3; z += 6) holes.push([plan.x + plan.w / 2, plan.y + plan.d, z], [plan.x + plan.w, plan.y + plan.d / 2, z]);
  return slab(plan, z0, z1 - z0, { tone: "mid" }, 2) + D(holes.map(at), { size: 0.35, tone: "lo" }) + (cap ? slab(k.insetPlan(plan, -0.6), z1, 1.4, { tone: "mid" }, 2, 0.3) : "");
}
function rackBack() {
  const out = [];
  // X bracing on the back face, upper bays only; drawn first so its ends tuck under the posts
  const yb = RACK.y0, xa = IX0 - 0.8, xb = IX1 + 0.8;
  for (let i = 0; i < LEVELS.length - 1; i++) {
    const z0 = LEVELS[i] + 2, z1 = LEVELS[i + 1] - 5;
    out.push(L(k.segment([xa, yb, z0], [xb, yb, z1], P) + k.segment([xa, yb, z1], [xb, yb, z0], P), { tone: "faint" }));
  }
  out.push(post(POSTS.lb, 0, RACK.top), post(POSTS.rb, 0, RACK.top));
  // bottom frame: back beam, cross bars, right side beam (it carries the bridge)
  out.push(box(IX0, RACK.y0, IX1, RACK.y0 + POST, 6, 4, { tone: "mid" }));
  for (const x of [IX0 + 4, -160, IX1 - 8]) out.push(box(x, RACK.y0 + POST, x + 4, RACK.y1 - POST, 6, 4, { tone: "lo" }));
  out.push(box(RACK.x0, RACK.y0 + POST, IX0, RACK.y1 - POST, 6, 4, { tone: "mid" }));
  out.push(box(IX1, RACK.y0 + POST, RACK.x1, RACK.y1 - POST, 6, 4, { tone: "mid" }));
  out.push(box(IX0, RACK.y1 - POST, IX1, RACK.y1, 6, 4, { tone: "mid" }));
  // two roller lanes
  for (const y of LANE_Y) {
    const bed = { x: IX0, y: y - 8.5, w: IX1 - IX0, d: 17, r: 0.6 };
    out.push(slab(bed, 10, DECK - 10, { tone: "lo", inner: L(k.sideSeam(bed, 12.5, P, 3), { tone: "faint" }) }));
    const rollers = [];
    for (let x = IX0 + 3; x < IX1 - 1; x += 4) rollers.push(k.lineOnTop([x, y - 7.3], [x, y + 7.3], DECK, P));
    out.push(L(rollers.join(""), { tone: "faint" }));
    out.push(box(IX0, y - 8.5, IX1, y - 7.3, DECK, 1.5, { tone: "mid" }), box(IX0, y + 7.3, IX1, y + 8.5, DECK, 1.5, { tone: "mid" }));
    out.push(box(IX0, y - 7.3, IX0 + 2, y + 7.3, DECK, 3, { tone: "mid" })); // end stop at the back of the lane
  }
  return out.join("");
}
// the shelves above the lanes, with stored crates
function rackUpper() {
  const out = [];
  const columns = [-192, -175.5, -159, -142.5, -126];
  const rows = [-16, 14];
  const missing = new Set(["1:3:0", "2:0:1", "2:4:0", "0:1:0", "1:4:1", "2:2:1"]);
  LEVELS.forEach((z, level) => {
    out.push(box(RACK.x0, RACK.y0 + POST, IX0, RACK.y1 - POST, z - 5, 5, { tone: "mid" }));
    out.push(box(IX0, RACK.y0, IX1, RACK.y0 + POST, z - 5, 5, { tone: "mid" }));
    out.push(box(IX0, RACK.y1 - POST, IX1, RACK.y1, z - 5, 5, { tone: "mid" }));
    const deck = { x: IX0, y: RACK.y0 + 2, w: IX1 - IX0, d: RACK.y1 - RACK.y0 - 4, r: 0.4 };
    out.push(slab(deck, z, 2, { tone: "mid" }, 2, 0.4));
    out.push(D([[IX0 + 3, RACK.y1 - 3, z + 2], [IX1 - 3, RACK.y1 - 3, z + 2]].map(at), { size: 0.4, tone: "lo" }));
    if (level === LEVELS.length - 1) return;
    const crates = [];
    rows.forEach((y, row) => columns.forEach((x, col) => { if (!missing.has(`${level}:${col}:${row}`)) crates.push([x, y]); }));
    for (const [x, y] of byDepth(crates)) out.push(X.crate(x, y, 0, { state: "done", lid: 1, tone: "mid", z: z + 2 }));
    // label holders on the front beam, one per bay column
    for (const x of columns) {
      const holder = { x: x - 4, y: RACK.y1, w: 8, d: 0.6, r: 0.2 };
      out.push(slab(holder, z - 4.2, 3.4, { tone: "lo", crease: "none" }, 1));
    }
  });
  // X bracing on the right side face (x = RACK.x1), upper bays only: the lanes leave below
  for (let i = 0; i < LEVELS.length - 1; i++) {
    const z0 = LEVELS[i] + 2, z1 = LEVELS[i + 1] - 5;
    const ya = RACK.y0 + POST - 0.8, yc = RACK.y1 - POST + 0.8;
    out.push(L(k.segment([RACK.x1, ya, z0], [RACK.x1, yc, z1], P) + k.segment([RACK.x1, ya, z1], [RACK.x1, yc, z0], P), { tone: "lo" }));
    out.push(screws([[RACK.x1, ya, z0], [RACK.x1, yc, z1], [RACK.x1, ya, z1], [RACK.x1, yc, z0]], { size: 0.4 }));
  }
  out.push(post(POSTS.lf, 0, RACK.top));
  out.push(post(POSTS.rf, LEVELS[0] - 5, RACK.top));
  return out.join("");
}
const rackFrontLow = () => post(POSTS.rf, 0, LEVELS[0] - 5, false);

// ---- the track ----
function track() {
  const out = [];
  const sleepers = [];
  for (let x = TRACK.x0 + 3; x < TRACK.x1 - 3; x += 12) sleepers.push(x);
  for (const x of sleepers) {
    out.push(box(x - 2.5, -27, x + 2.5, 33, 0, 1.5, { tone: "lo" }));
  }
  for (const y of RAIL_Y) {
    out.push(box(TRACK.x0, y - 1.5, TRACK.x1, y + 1.5, 1.5, 3, { tone: "mid" }, 0.4, 0.3));
  }
  out.push(D(sleepers.flatMap((x) => RAIL_Y.flatMap((y) => [[x, y - 2.6, 1.5], [x, y + 2.6, 1.5]])).map(at), { size: 0.35, tone: "mid" }));
  // buffer stops at both ends, each a block on the rail with a round pad
  for (const y of RAIL_Y) {
    out.push(box(TRACK.x0, y - 2, TRACK.x0 + 3, y + 2, 4.5, 5.5, { tone: "mid" }, 0.5));
    out.push(box(TRACK.x1 - 4, y - 2, TRACK.x1 - 1, y + 2, 4.5, 6.5, { tone: "mid" }, 0.5));
    out.push(S(G.disc(0, 1.1, 1.5, G.frameAlong([TRACK.x1 - 5.1, y, 8], [1, 0, 0]), P), { tone: "lo" }));
  }
  // the bridge plate from the rack lanes to the cart deck, resting on the side beam
  const bridge = { x: IX1, y: LANE_Y[0] - 8.5, w: CART_X[0] - 14 - IX1, d: LANE_Y[1] - LANE_Y[0] + 17, r: 0.5 };
  out.push(slab(bridge, 10, DECK - 10, { tone: "mid" }, 2, 0.4));
  out.push(L([LANE_Y[0], LANE_Y[1]].map((y) => k.lineOnTop([bridge.x + bridge.w / 2, y - 7], [bridge.x + bridge.w / 2, y + 7], DECK, P)).join(""), { tone: "faint" }));
  return out.join("");
}

// ---- the cart (built at the warehouse stop, moved with translateAlong) ----
const CX = CART_X[0];
function cart() {
  const out = [];
  const halo = { x: CX - 15, y: -22, w: 30, d: 50, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(halo, 4.5, 0.1, P)}" style="filter:blur(3px)"/>`);
  // far wheels, chassis, near wheels
  const wheel = (x, y, near) => {
    const F = G.frameAlong([CX + x, y + (near ? 1.5 : -1.5), 8.5], [0, near ? 1 : -1, 0]);
    return S(G.disc(-3, 0, 4, F, P), { tone: "mid" }) + (near ? S(G.disc(0, 0.8, 1.6, F, P), { tone: "lo" }) : "");
  };
  for (const x of [-10, 10]) out.push(wheel(x, RAIL_Y[0], false));
  out.push(box(CX - 15, RAIL_Y[0] + 1.5, CX + 15, RAIL_Y[1] - 1.5, 7.5, 5.1, { tone: "mid", inner: L(k.sideSeam({ x: CX - 15, y: RAIL_Y[0] + 1.5, w: 30, d: RAIL_Y[1] - RAIL_Y[0] - 3, r: 0.6 }, 9.5, P, 3), { tone: "faint" }) }));
  out.push(screws([-10, 10].map((x) => [CX + x, RAIL_Y[1] - 1.5, 11])));
  for (const x of [-10, 10]) out.push(wheel(x, RAIL_Y[1], true));
  // the deck: this is the part that is lit when the cart is the bottleneck
  const deck = { x: CX - 14, y: -24, w: 28, d: 55, r: 1.4 };
  out.push(`<g data-part="cart-deck">${S(k.slabOf(deck, 12.6, DECK - 12.6, P, 3, 0.6), { tone: "hi", crease: "lo", inner: L(k.sideSeam(deck, 14.3, P, 3), { tone: "faint" }) })}</g>`);
  for (const y of LANE_Y) {
    const rollers = [];
    for (let x = -10; x <= 10; x += 5) rollers.push(k.lineOnTop([CX + x, y - 7.3], [CX + x, y + 7.3], DECK, P));
    out.push(L(rollers.join(""), { tone: "faint" }));
    out.push(box(CX - 14, y - 8.5, CX + 14, y - 7.3, DECK, 1.5, { tone: "mid" }), box(CX - 14, y + 7.3, CX + 14, y + 8.5, DECK, 1.5, { tone: "mid" }));
  }
  // its motor: fixed speed, like the bandwidth it stands for
  const F = G.frameAlong([CX - 3, -17, 21.6], [1, 0, 0]);
  out.push(box(CX - 10, -21, CX - 6, -13, DECK, 1.2, { tone: "lo" }), box(CX + 1, -21, CX + 5, -13, DECK, 1.2, { tone: "lo" }));
  out.push(S(G.solidOf([[-10, 3.4], [-9.4, 4.6, 1], [-8.6, 5], [6, 5], [6, 4.2], [8, 4.2], [8, 2], [10.5, 2]], F, P), { tone: "mid", inner: k.fadedSvg(G.ribsOf(F, -8.6, 6, 5.02, 18, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }) }));
  out.push(box(CX + 7.5, -21.5, CX + 13, -12.5, DECK, 9.5, { tone: "mid" }, 0.8, 0.4));
  out.push(screws([[CX + 9, -12.5, DECK + 7.5], [CX + 11.5, -12.5, DECK + 7.5]]));
  out.push(box(CX - 5.5, -19.4, CX + 0.5, -14.6, 26.4, 2.6, { tone: "mid" }, 0.5));
  return out.join("");
}

// ---- the bench: a machine bed with an index table ----
function bench() {
  const out = [];
  for (const [x, y] of byDepth(k.corners(BENCH, 7))) out.push(S(k.cylinder(x, y, 4.2, 0, 2, P, 20), { tone: "lo" }));
  out.push(S(k.slabOf(BENCH, 2, BED_TOP - 2, P, 4, 1), { tone: "mid", inner: L(k.sideSeam(BENCH, 4.5, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BENCH, 3), BED_TOP, P, 4), { tone: "faint" }));
  out.push(screws(k.corners(BENCH, 4).map(([x, y]) => [x, y, BED_TOP])));
  // the apron the crates slide across, cut to the table's edge
  const [tx, ty] = TABLE.c;
  const rArc = TABLE.r + 1;
  const yA = -12, yB = 31;
  const a0 = Math.PI + Math.asin(-yA / rArc), a1 = Math.PI - Math.asin(yB / rArc);
  const ring = [[63, yA]];
  for (let i = 0; i <= 24; i++) { const a = a0 + (a1 - a0) * (i / 24); ring.push([tx + rArc * Math.cos(a), ty + rArc * Math.sin(a)]); }
  ring.push([63, yB]);
  out.push(S(k.extrude(ring, BED_TOP, DECK - BED_TOP, P, { convex: false }), { tone: "mid" }));
  out.push(L([LANE_Y[0], LANE_Y[1]].map((y) => k.lineOnTop([65.5, y - 7], [65.5, y + 7], DECK, P)).join(""), { tone: "faint" }));
  // index drive at the back of the table
  out.push(box(92, -39, 120, -33.6, BED_TOP, 7, { tone: "mid" }, 0.8, 0.4));
  out.push(S(G.solidOf([[0, 2.8], [9, 2.8], [9, 2], [10, 2]], G.frameAlong([120, -36.3, 14.5], [1, 0, 0]), P), { tone: "mid", inner: k.fadedSvg(G.ribsOf(G.frameAlong([120, -36.3, 14.5], [1, 0, 0]), 0.8, 8.2, 2.82, 12, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }) }));
  out.push(screws([[95, -33.6, 17], [117, -33.6, 17]]));
  // the table: a fixed ring and the turning disc
  out.push(S(k.cylinder(tx, ty, TABLE.r + 0.5, BED_TOP, 2, P, 72), { tone: "lo" }));
  out.push(S(k.cylinder(tx, ty, TABLE.r, BED_TOP + 2, DECK - BED_TOP - 2, P, 72, 0.6), { tone: "mid", crease: "lo" }));
  out.push(`<g data-part="table-marks">${X.tableMarks(tx, ty, TABLE.R, TABLE.r - 0.8, DECK, 0)}</g>`);
  out.push(S(k.cylinder(tx, ty, 4, DECK, 1.2, P, 28), { tone: "mid" }), L(k.ring(tx, ty, 1.6, DECK + 1.2, P, 16), { tone: "lo" }));
  return out.join("");
}

// ---- the worker: a spindle head on a column, driven at a fixed speed ----
const ARM_Z = 70, FLY_Z = 78, MOTOR_Z = 84, GOV = { z: 99.5, top: 114, ball: 104.5, reach: 7.4, r: 2.5 };
function workerBack() {
  const [cx, cy] = COLUMN, [hx, hy] = HEAD;
  const out = [];
  out.push(S(k.cylinder(cx, cy, 8.5, BED_TOP, 3, P, 40, 0.5), { tone: "mid" }));
  out.push(D(Array.from({ length: 6 }, (_, i) => { const a = (i * Math.PI) / 3 + 0.3; return at([cx + 6.6 * Math.cos(a), cy + 6.6 * Math.sin(a), BED_TOP + 3]); }), { size: 0.45, tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 4.8, BED_TOP + 3, ARM_Z - 2 - BED_TOP - 3, P, 32), { tone: "mid", crease: "none", inner: L(k.sideArc(cx, cy, 4.8, 40, P, 20), { tone: "faint" }) }));
  out.push(S(k.cylinder(cx, cy, 7, ARM_Z - 2, 12, P, 40, 0.5), { tone: "mid" }));
  // clamp screw on the collar
  out.push(S(G.disc(0, 2.6, 1.6, G.frameAlong([cx, cy + 7, ARM_Z + 4], [0, 1, 0]), P), { tone: "mid" }));
  // arm out to the head
  const arm = { x: hx - 2, y: hy - 6, w: cx - 6.4 - (hx - 2), d: 12, r: 2 };
  out.push(slab(arm, ARM_Z, 8, { tone: "mid" }, 3, 0.5));
  out.push(screws([[hx + 10, hy + 6, ARM_Z + 4], [cx - 9, hy + 6, ARM_Z + 4]]));
  return out.join("");
}
function workerHead() {
  const [hx, hy] = HEAD;
  const out = [];
  out.push(`<g data-part="head">${S(k.cylinder(hx, hy, 7.5, 46, ARM_Z - 46, P, 48, 0.5), { tone: "hi", crease: "lo", inner: L(k.sideArc(hx, hy, 7.5, 52, P, 24) + k.sideArc(hx, hy, 7.5, 64, P, 24), { tone: "faint" }) })}</g>`);
  // feed capstan on the near side of the head
  const F = G.frameAlong([hx, hy + 7.5, 58], [0, 1, 0]);
  out.push(S(G.disc(0, 3, 2.2, F, P), { tone: "mid" }));
  const hub = [hx, hy + 10.5, 58];
  for (const a of [-0.5, 1.6, 3.7]) {
    const end = [hx + 9 * Math.cos(a), hy + 10.5, 58 + 9 * Math.sin(a)];
    const [ex, ey] = at(end), br = 1.4 * P.scale;
    out.push(L(k.segment(hub, end, P), { tone: "mid" }), `<circle class="mh-ball" cx="${ex.toFixed(2)}" cy="${ey.toFixed(2)}" r="${br.toFixed(2)}"/><circle class="mh-shine" cx="${(ex - br * 0.32).toFixed(2)}" cy="${(ey - br * 0.32).toFixed(2)}" r="${(br * 0.42).toFixed(2)}"/>`);
  }
  out.push(`<g data-part="quill">${S(k.cylinder(hx, hy, 2.6, 39, 7, P, 24), { tone: "hi", crease: "none" })}</g>`);
  out.push(S(k.cylinder(hx, hy, 1.5, 36.5, 2.5, P, 16), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(hx, hy, 5, 33, 3.5, P, 40, 0.4), { tone: "mid" }));
  out.push(`<g data-part="cutter">${L(X.spinMarks(hx, hy, 5, 33.4, 36.1, 16, 0), { tone: "lo" })}</g>`);
  return out.join("");
}
function workerTop() {
  const [cx, cy] = COLUMN, [hx, hy] = HEAD;
  const out = [];
  // motor pulley, flywheel, belt (drawn under the motor flange)
  out.push(S(k.cylinder(cx, cy, 4, ARM_Z + 10, MOTOR_Z - ARM_Z - 10, P, 32), { tone: "mid" }));
  out.push(S(k.cylinder(hx, hy, 11, FLY_Z, 4, P, 64, 0.6), { tone: "mid", crease: "lo" }));
  out.push(L(k.ring(hx, hy, 9.4, FLY_Z + 4, P, 64) + k.ring(hx, hy, 2.8, FLY_Z + 4, P, 24), { tone: "lo" }));
  out.push(`<g data-part="flywheel">${L(X.spokes(hx, hy, 2.8, 9.4, FLY_Z + 4, 5, 0), { tone: "lo" })}</g>`);
  out.push(S(k.cylinder(hx, hy, 2.8, FLY_Z + 4, 1.2, P, 24), { tone: "mid" }));
  const zb = FLY_Z + 2;
  const dx = cx - hx, dist = Math.abs(dx), r1 = 11, r2 = 4;
  const sin = (r1 - r2) / dist, cos = Math.sqrt(1 - sin * sin);
  for (const side of [-1, 1]) {
    const nx = sin * Math.sign(dx), ny = side * cos;
    out.push(L(k.segment([hx + r1 * nx, hy + r1 * ny, zb], [cx + r2 * nx, cy + r2 * ny, zb], P), { tone: "mid" }));
  }
  // motor and governor
  out.push(S(k.cylinder(cx, cy, 6.6, MOTOR_Z, 1.6, P, 40), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 6, MOTOR_Z + 1.6, GOV.z - MOTOR_Z - 3.1, P, 40), { tone: "mid", inner: L(k.knurl(cx, cy, 6, MOTOR_Z + 3.2, GOV.z - 3.2, 28, P, 0), { tone: "lo" }) + L(k.sideArc(cx, cy, 6, MOTOR_Z + 3.2, P, 24) + k.sideArc(cx, cy, 6, GOV.z - 3.2, P, 24), { tone: "faint" }) }));
  out.push(S(k.cylinder(cx, cy, 6.6, GOV.z - 1.5, 1.5, P, 40, 0.4), { tone: "mid" }));
  out.push(`<g data-part="gov-back"></g>`);
  out.push(S(k.cylinder(cx, cy, 0.8, GOV.z, GOV.top - GOV.z, P, 12), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(cx, cy, 1.8, GOV.top - 2, 2, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 1.8, GOV.z, 1.4, P, 20), { tone: "mid" }));
  out.push(`<g data-part="gov-front"></g>`);
  return out.join("");
}

// ---- gauges and the job selector ----
function gauge({ c: [x, y], r, z, h }, name, stand) {
  const out = [];
  out.push(S(k.cylinder(x, y, stand.r, stand.z0, z - stand.z0, P, 20), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, y, r, z, h, P, 64, 0.6), { tone: "hi", crease: "lo", inner: L(k.sideArc(x, y, r, z + h - 1.6, P, 32), { tone: "faint" }) }));
  const top = z + h;
  out.push(L(k.ring(x, y, r - 1.4, top, P, 64), { tone: "lo" }));
  const t = k.radialTicks(x, y, r - 1.4, 20, 5, top, [r * 0.12, r * 0.24], P, X.SWEEP.from, X.SWEEP.span);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(`<path data-part="${name}" class="iso-line" data-tone="hi" data-free="start" d="${X.needle(x, y, r - 2.4, top + 0.2, 0)}" style="stroke-width:1"/>`);
  out.push(L(k.ring(x, y, 1.2, top + 0.2, P, 16), { tone: "mid" }));
  return out.join("");
}
function selector() {
  const out = [];
  const b = { x: KNOB[0] - 15, y: KNOB[1] - 7, w: 30, d: 14, r: 1.6 };
  out.push(S(k.slabOf(b, 0, 8, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(b, 2.4, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(b, 2), 8, P, 4), { tone: "faint" }));
  out.push(screws(k.corners(b, 2.6).map(([x, y]) => [x, y, 8])));
  // two positions: left for softmax, right for matmul
  const marks = [-1.35, 1.35].map((a) => at([KNOB[0] + 7.6 * Math.sin(a), KNOB[1] + 1 - 7.6 * Math.cos(a), 8]));
  out.push(D(marks, { size: 0.8, tone: "hi" }));
  out.push(`<g data-part="knob" style="cursor:pointer">${S(k.cylinder(KNOB[0], KNOB[1] + 1, 4.4, 8, 4, P, 36), { tone: "mid" })}${L(k.knurl(KNOB[0], KNOB[1] + 1, 4.4, 8, 12, 30, P), { tone: "lo" })}<path data-part="pointer" class="iso-line" data-tone="hi" data-free="start" d="" style="stroke-width:1"/></g>`);
  return out.join("");
}

// ---- assemble ----
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "A small plant on a base plate. On the left a tall flow rack, the warehouse, holds crates on shelves and feeds two roller lanes at its foot. A motor cart runs on a track between the rack and a machine bed on the right, carrying one crate each way. On the bed a four-pocket index table turns crates under a spindle head, the worker, which is driven by a motor with a flyball governor at a fixed speed. A gauge at each end reads how busy the cart and the worker are; a selector knob picks the job.",
  body: [
    base(),
    rackBack(),
    `<g data-layer="rack-crates"></g>`,
    rackUpper(),
    track(),
    `<g data-part="cart">${cart()}</g>`,
    bench(),
    `<g data-layer="crates"></g>`,
    rackFrontLow(),
    workerBack(),
    workerHead(),
    workerTop(),
    gauge(GAUGE_WORK, "needle-worker", { r: 2.4, z0: BED_TOP }),
    gauge(GAUGE_CART, "needle-cart", { r: 3, z0: 0 }),
    selector(),
  ],
});

const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const CONFIG = { P, LANE_Y, CART_X, TABLE, STATION, HEAD, COLUMN, FLY_Z, GOV, GAUGE_CART, GAUGE_WORK, KNOB, RACK_FACE: IX1 };
const live = `
const k = { ${Object.keys(k).join(", ")} };
${strip("model.mjs")}
${strip("parts.mjs")}
const C = ${JSON.stringify(CONFIG)};
${readFileSync(join(HERE, "live.js"), "utf8")}
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Memory hierarchy",
  hint: "Click or press 1 / 2 to change job",
  readout: "softmax",
  keys: [
    { mark: "lit", label: "The bottleneck: the cart for softmax, the worker for matmul" },
    { mark: "raised", label: "Crates of 24 KiB; four fill the bench's 96 KiB" },
  ],
  caption: `One SM of a V100. The warehouse is HBM (32 GB, 900 GB/s for the whole chip, ${(M.PER_SM.bw / 1e9).toFixed(2)} GB/s for this SM); the bench is the SM's 96 KiB of shared memory; the cart is the path between them; the worker is the SM's share of the 15.7 TFLOP/s fp32 math, and its governor holds it at that speed. The worker breaks even when a job does ${M.RIDGE.toFixed(1)} FLOPs per byte the cart moves. Softmax does about 5 FLOPs per element, ${M.JOBS.softmax.flopsPerByte} per byte, so the cart never stops and the worker waits ${(100 - (100 * M.JOBS.softmax.flopsPerByte) / M.RIDGE).toFixed(0)}% of the time: the job reaches ${(100 * M.attainable(M.JOBS.softmax) / M.V100.peak).toFixed(1)}% of peak however fast the worker is. A ${M.JOBS.matmul.N} × ${M.JOBS.matmul.N} matmul does ${M.JOBS.matmul.flopsPerByte.toFixed(0)} FLOPs per byte, so the worker never stops and the cart waits. One cart leg, 24 KiB, takes ${(M.LEG_SECONDS * 1e6).toFixed(2)} µs on the GPU and 1.2 s here.`,
  body: `<div class="iso-stage" tabindex="0" role="radiogroup" aria-label="Memory hierarchy machine: press 1 for softmax, 2 for matmul, or click to switch">${svg}</div>`,
});
const jobs = `<div class="mh-jobs" role="group" aria-label="Job"><button type="button" data-job="softmax" aria-pressed="true">1 · softmax</button><button type="button" data-job="matmul" aria-pressed="false">2 · matmul ${M.JOBS.matmul.N}²</button></div>`;
const CSS = `
.mh-ball,.mh-gov{fill:var(--anatomy-shade-1);stroke:var(--anatomy-mid);stroke-width:.6}
.mh-gov{stroke:var(--anatomy-hi)}
.mh-shine{fill:var(--anatomy-face);stroke:none}
.iso-solid>*{transition:fill .5s ease,stroke .5s ease}
.iso-stage{cursor:pointer;outline:none}
.iso-stage:focus-visible{box-shadow:0 0 0 1px var(--anatomy-faint);border-radius:6px}
.mh-jobs{display:flex;gap:8px;justify-content:center;margin:14px 0 0}
.mh-jobs button{font:11px/1 var(--anatomy-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--anatomy-muted);background:transparent;border:1px solid var(--anatomy-faint);border-radius:999px;padding:7px 12px;cursor:pointer}
.mh-jobs button[aria-pressed="true"]{color:var(--anatomy-text);border-color:var(--anatomy-hi)}
@media (max-width:520px){.iso-plate-corner[data-corner="hint"]{display:none}.iso-plate-corner[data-corner="readout"]{font-size:8.6px;letter-spacing:0}}
`;
const page = body.replace("<figcaption", `${jobs}<figcaption`);
const name = theme === "light" ? "memory-hierarchy.html" : "memory-hierarchy-dark.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Memory hierarchy", theme, body: `<style>${CSS}</style>${page}`, script: kitScript() + live, width: 700 }));
console.log("wrote", name, (readFileSync(join(HERE, name)).length / 1024).toFixed(0) + " KB");
