// 2014 Buick Verano as a rolling chassis: node build.mjs [--audit]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import * as T from "../.claude/skills/anatomy/kit/tube.mjs";
import * as A from "../.claude/skills/anatomy/kit/audit.mjs";
import { kitScript } from "../.claude/skills/anatomy/scripts/inline-kit.mjs";
import * as SPEC from "./spec.mjs";
import { makeParts } from "./parts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = join(HERE, "..", ".claude", "skills", "anatomy", "kit");
const W = 720, H = 380;
const { CAR, SELECTOR, RANGES } = SPEC;

// ---------------- layout (cm; x forward, y left, z up; front axle at x = 0) ----------------
const WB = CAR.wheelbase, TR = CAR.tireRadius;
const XF = 0, XR = -WB;
const YF = CAR.trackFront / 2, YR = CAR.trackRear / 2;
const NOSE = CAR.overhangFront, TAIL = XR - (CAR.length - WB - CAR.overhangFront);
const STAND = { x: TAIL - 22, y: -108, w: NOSE - TAIL + 44, d: 216, r: 12 };
const STAND_H = 6;
const SILL = { y0: 78, y1: 88, x0: -230, x1: -93, z0: 12, z1: 30 };
const TUNNEL = { x: -232, y: -13, w: 139, d: 26, r: 4, z0: 12, z1: 40 };
const FIRE = { x: -90, t: 3, y: 86, z0: 20, z1: 86 };
const RAIL = { y0: 47, y1: 57, x0: FIRE.x, x1: 58, z0: 56, z1: 68 };
const STRUT_Y = 61;
const TOWER = { x: 2, y: STRUT_Y, rIn: 9.6, r: 11.6, z0: 72, z1: 90 };
const APRON = { z0: 68, z1: 72 };
const RRAIL = { y0: 40, y1: 52, x0: -372, x1: -228, z0: 58, z1: 68 };
const ENGINE = { x: -8, y: -44, w: 44, d: 47 }; // block footprint
const CRANK = [14, 50]; // x, z of the crank axis
const BELL = { y0: 3, y1: 17 };
const CASE = { x: -24, y: 17, w: 52, d: 18, r: 3, z0: 30, z1: 82 };
const COVER_Y = CASE.y + CASE.d + 3;
const IMS = { x: -16, y: 23, w: 12, d: 12, z0: 82, z1: 90 };
const MANUAL = { shaftEnd: [-10, 42.1, 86] };
const CABLE_R = 0.7;
const TRANS_BRACKET = { x: -24, gland: [-21, 41, 90] };
const SHIFTER = { pivot: [-164, 0, 52], stick: 24, pinS: 6, pinHalf: 7.6, gland: [-148, 0, 43.2] };
const RACK = { x: -30, z: 30, r: 2.6, y: 52, pinionY: 40 };
const SUBF = { x0: -28, x1: 32, yIn: 36, yOut: 44, z0: 18, z1: 26 };
const KNUCKLE_Y = 58; // the hub carrier's centre plane, inboard of the tyre
const COLUMN = { hub: [-130, 37, 92], through: [FIRE.x, 37, 56] };
const columnAxis = G.unit3(G.sub3(COLUMN.hub, COLUMN.through));
const FAN = { c: [52, -10, 40], r: 20 };

const LAYOUT = {
  tire: { width: CAR.tireWidth, radius: TR },
  selector: SELECTOR,
  shifter: SHIFTER,
  manual: MANUAL,
  column: { frame: G.frameAlong(COLUMN.hub, columnAxis) },
  fan: { frame: G.frameAlong(FAN.c, [1, 0, 0]), r: FAN.r },
  wheels: { FL: [XF, YF, TR], FR: [XF, -YF, TR], RL: [XR, YR, TR], RR: [XR, -YR, TR] },
  rackEnd: (side, travel) => [RACK.x, side * (RACK.y + 0.01) + travel, RACK.z],
  knuckleY: KNUCKLE_Y,
};

const P = k.fitProjection(
  [...k.boxCorners(STAND, -STAND_H, 0), [TOWER.x, TOWER.y, TOWER.z1 + 3], [TOWER.x, -TOWER.y, TOWER.z1 + 3], [COLUMN.hub[0] - 6, COLUMN.hub[1], COLUMN.hub[2] + 18], [ENGINE.x, ENGINE.y, 100]],
  W, H, { pad: 24, azimuth: 63, elevation: 36 },
);
const X = makeParts(k, G, P, LAYOUT);
const V = G.viewOf(P);
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (pts, style) => k.dotsSvg(pts, style);
const rad = (d) => (d * Math.PI) / 180;

// ---------------- recorder: every item gets a shape, settle sets the painter's keys ----------------
const R = A.recorder(P);
const record = R.solid;
function put(at3, svg, { bias = 0, name, shapes = [], part, owner } = {}) {
  for (const s of shapes) if (owner && !s.owner) s.owner = owner;
  return R.put({ piece: "car", at: at3, bias, svg, shapes, name: name ?? R.nameFor(owner ? `${owner}.item` : "car.item"), part });
}
const centreOf = (plan, z, h) => [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2];
function boxAt(plan, z, h, style = {}, { steps = 3, bevel = 0, name, owner, inner = "", bias = 0, extra = "" } = {}) {
  const id = name ?? R.nameFor(`${owner ?? "box"}.box`);
  put(centreOf(plan, z, h), S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, { bias, name: id, owner, shapes: [record(A.slab(plan, z, h, { name: id, owner }, steps))] });
}
const box = (x0, y0, x1, y1, z0, z1, style, opts) => boxAt({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: opts?.r ?? 0.8 }, z0, z1 - z0, style, opts);
function turned(F, profile, style = {}, { name, owner, inner = "", bias = 0, extra = "", smooth } = {}) {
  const id = name ?? R.nameFor(`${owner ?? "turned"}.part`);
  const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
  put(G.add3(F.o, G.mul3(F.a, mid)), S(G.solidOf(profile, F, P, smooth !== undefined ? { smooth } : {}), { tone: "mid", ...style, inner }) + extra, { bias, name: id, owner, shapes: [record(A.solid(F, profile, { name: id, owner }))] });
}
function discAt(F, s0, s1, r, style = {}, opts = {}) {
  const id = opts.name ?? R.nameFor(`${opts.owner ?? "disc"}.disc`);
  put(G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), S(G.disc(s0, s1, r, F, P), { tone: "mid", ...style, inner: opts.inner ?? "" }) + (opts.extra ?? ""), { bias: opts.bias ?? 0, name: id, owner: opts.owner, shapes: [record(A.disc(F, s0, s1, r, { name: id, owner: opts.owner }))] });
}
function prismAt(F, poly, s0, s1, style = {}, opts = {}) {
  const id = opts.name ?? R.nameFor(`${opts.owner ?? "prism"}.prism`);
  const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length, cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
  const c = G.pointOf(F, (s0 + s1) / 2, 0, 0).map((v, i) => v + F.u[i] * cx + F.v[i] * cy);
  put(c, S(G.prismOf(F, poly, s0, s1, P), { tone: "mid", ...style }) + (opts.extra ?? ""), { bias: opts.bias ?? 0, name: id, owner: opts.owner, shapes: [record(A.prism(F, poly, s0, s1, { name: id, owner: opts.owner }))] });
}
function ballAt(c, r, style = {}, opts = {}) {
  const id = opts.name ?? R.nameFor(`${opts.owner ?? "ball"}.ball`);
  put(c, S(G.sphereOf(c, r, P), { tone: "mid", ...style }), { bias: opts.bias ?? 0, name: id, owner: opts.owner, shapes: [record(A.ball(c, r, { name: id, owner: opts.owner }))] });
}
// A pipe, hose or cable: filleted legs, drawn in depth-sorted chunks, recorded as a route.
function tubeAt(points, r, { name, owner, tone = "hi", bend = 2.6, maxLength = 24, gaps = [], caps = true, limp = false, touch, ends = [true, true], free, bias = 0, rims, breaksAt = [] } = {}) {
  const id = name ?? R.nameFor(`${owner ?? "tube"}.tube`);
  const line = G.fillet(points, Math.max(r * bend, 3), 10, { P, tube: r });
  const breaks = breaksAt.flatMap(({ centre, axis, radius, half }) => T.crossingsOf(line, centre, axis, radius).flatMap((at) => [at - half, at + half]));
  R.route(id, line, r, { owner: id, touch, limp, gaps, caps, ends, free, rims, piece: "car" });
  T.tubePieces(line, r, P, { maxLength, gaps, caps, breaks, spacing: Math.max(0.8, Math.min(2.2, r * 0.3)) }).forEach((piece, index) =>
    put(piece.mid, T.tubeSvg(piece, { tone }), { bias, name: `${id}:${index}`, owner: id, route: id, chunk: index, shapes: [A.tube(piece.points, piece.radii, { name: `${id}:${index}`, owner: id, limp })] }),
  );
  return line;
}
const mirror = ([x, y, z]) => [x, -y, z];
// A long member drawn in segments no longer than `seg`, so each orders itself against what it passes.
function longBox(x0, y0, x1, y1, z0, z1, style, { seg = 48, owner, name, bevel = 0, r = 0.8, inner } = {}) {
  const alongX = x1 - x0 >= y1 - y0;
  const length = alongX ? x1 - x0 : y1 - y0;
  const count = Math.max(1, Math.ceil(length / seg));
  for (let i = 0; i < count; i++) {
    const a = (alongX ? x0 : y0) + (length * i) / count, b = (alongX ? x0 : y0) + (length * (i + 1)) / count;
    const plan = alongX ? { x: a, y: y0, w: b - a, d: y1 - y0, r } : { x: x0, y: a, w: x1 - x0, d: b - a, r };
    boxAt(plan, z0, z1 - z0, style, { owner, name: `${name}.${i}`, bevel, inner: inner ? inner(plan) : "" });
  }
}
// The point where a tube of radius `rt` ends on a ball of radius `rb` at `c`, coming from `from`.
const rimOn = (c, rb, rt, from) => { const d = G.unit3(G.sub3(from, c)); return G.add3(c, G.mul3(d, Math.sqrt(Math.max(0, rb * rb - rt * rt)))); };
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const screws = (pts, size = 0.45) => Dots(pts.map(at), { size, tone: "mid" });

// ---------------- the stand (drawn first, outside the sorted layer) ----------------
const back = [`<path class="iso-halo" d="${k.haloOf(STAND, -STAND_H, STAND_H, P)}"/>`];
back.push(S(k.slabOf(STAND, -STAND_H, STAND_H, P, 10, 1.4), { tone: "mid" }));
record(A.slab(STAND, -STAND_H, STAND_H, { name: "stand.plate", ground: true }, 10));
back.push(Ln(k.planOutline(k.insetPlan(STAND, 6), 0, P, 10), { tone: "faint" }));
// a ruler strip along the near edge, one tick per 10 cm, a major every half metre
const RULER = { x: TAIL, y: STAND.y + 9, w: NOSE - TAIL, d: 7, r: 1 };
back.push(S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
{
  const t = k.topTicks(RULER.x + 3, RULER.x + RULER.w - 3, 10, 5, RULER.y + 0.8, 0.6, [2.2, 4.2], P);
  back.push(Ln(t.minor, { tone: "lo" }), Ln(t.major, { tone: "mid" }));
  back.push(screws([[RULER.x + 1.5, RULER.y + 3.5, 0.6], [RULER.x + RULER.w - 1.5, RULER.y + 3.5, 0.6]]));
}
// axle-line marks on the stand under both axles
for (const x of [XF, XR]) back.push(Ln(k.lineOnTop([x, STAND.y + 20], [x, STAND.y + 26], 0, P) + k.lineOnTop([x, STAND.y + STAND.d - 26], [x, STAND.y + STAND.d - 20], 0, P), { tone: "lo" }));
// label plate at the front-right corner
const LABEL = { x: NOSE - 4, y: STAND.y + 20, w: 22, d: 40, r: 1.5 };
back.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "faint" }), Ln(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P, 4), { tone: "faint" }));
back.push(Ln([[0, 30], [3, 22], [6, 26]].map(([dx, len]) => k.lineOnTop([LABEL.x + 5 + dx, LABEL.y + 5], [LABEL.x + 5 + dx, LABEL.y + 5 + len], 0.8, P)).join(""), { tone: "lo", free: true }));
back.push(screws([[LABEL.x + 3, LABEL.y + 3, 0.8], [LABEL.x + LABEL.w - 3, LABEL.y + LABEL.d - 3, 0.8]]));

// ---------------- body hardpoints (the shell is left off) ----------------
const BODY = "body";
for (const side of [1, -1]) {
  const y0 = Math.min(side * SILL.y0, side * SILL.y1), y1 = Math.max(side * SILL.y0, side * SILL.y1);
  longBox(SILL.x0, y0, SILL.x1, y1, SILL.z0, SILL.z1, { tone: "mid" }, { owner: BODY, name: `body.sill${side > 0 ? "L" : "R"}`, bevel: 0.5, seg: 50, inner: (plan) => Ln(k.sideSeam(plan, SILL.z0 + 6, P, 3), { tone: "faint" }) });
  // kick-up from the sill to the rear rail, and the rear rail itself
  box(-236, Math.min(side * 40, side * 54), -228, Math.max(side * 40, side * 54), SILL.z0, RRAIL.z1, { tone: "mid" }, { owner: BODY, name: `body.kick${side > 0 ? "L" : "R"}` });
  box(-234, Math.min(side * 54, side * 88), -230, Math.max(side * 54, side * 88), SILL.z0, SILL.z1, { tone: "mid" }, { owner: BODY, name: `body.sillend${side > 0 ? "L" : "R"}` });
  longBox(RRAIL.x0, Math.min(side * RRAIL.y0, side * RRAIL.y1), RRAIL.x1, Math.max(side * RRAIL.y0, side * RRAIL.y1), RRAIL.z0, RRAIL.z1, { tone: "mid" }, { owner: BODY, name: `body.rrail${side > 0 ? "L" : "R"}`, seg: 44 });
  // front rail from the firewall to the radiator support, strut tower on it
  longBox(RAIL.x0, Math.min(side * RAIL.y0, side * RAIL.y1), RAIL.x1, Math.max(side * RAIL.y0, side * RAIL.y1), RAIL.z0, RAIL.z1, { tone: "mid" }, { owner: BODY, name: `body.rail${side > 0 ? "L" : "R"}`, seg: 54 });
  // the strut tower: an apron plate on the rail with a hole for the strut, and an open cup round the spring
  for (const [ya, yb, j] of [[RAIL.y0 + 1, STRUT_Y - 3.6, 0], [STRUT_Y + 3.6, TOWER.y + 13, 1]]) box(-12, Math.min(side * ya, side * yb), 12, Math.max(side * ya, side * yb), APRON.z0, APRON.z1, { tone: "mid" }, { owner: BODY, name: `body.apron${side > 0 ? "L" : "R"}.${j}`, bevel: 0.4 });
  const TF = G.frameAlong([TOWER.x, side * TOWER.y, TOWER.z0], [0, 0, 1]);
  put([TOWER.x, side * TOWER.y, TOWER.z0 + 9], S(G.ringBand(0, TOWER.z1 - TOWER.z0, TOWER.rIn, TOWER.r, TF, P), { tone: "mid", inner: Ln(G.arcOf(TF, TOWER.z1 - TOWER.z0 - 5, TOWER.r, P), { tone: "faint" }) }), { owner: BODY, name: `body.tower${side > 0 ? "L" : "R"}`, bias: 0.5, shapes: [record(A.ring(TF, 0, TOWER.z1 - TOWER.z0, TOWER.rIn, TOWER.r, { name: `body.tower${side > 0 ? "L" : "R"}`, owner: BODY }))] });
  put([TOWER.x, side * TOWER.y, TOWER.z1 + 0.8], S(G.ringBand(TOWER.z1 - TOWER.z0, TOWER.z1 - TOWER.z0 + 1.6, TOWER.rIn, TOWER.r + 2.4, TF, P), { tone: "mid" }) + Dots(G.dotsOf(TF, TOWER.z1 - TOWER.z0 + 1.6, TOWER.r + 1.1, 3, P, { all: true, phase: 0.6 }), { size: 0.5, tone: "mid" }), { owner: BODY, name: `body.towertop${side > 0 ? "L" : "R"}`, bias: 0.6, shapes: [record(A.ring(TF, TOWER.z1 - TOWER.z0, TOWER.z1 - TOWER.z0 + 1.6, TOWER.rIn, TOWER.r + 2.4, { name: `body.towertop${side > 0 ? "L" : "R"}`, owner: BODY }))] });
  // radiator support uprights
  box(70, Math.min(side * 58, side * 64), 76, Math.max(side * 58, side * 64), 10, 67, { tone: "mid" }, { owner: BODY, name: `body.radpost${side > 0 ? "L" : "R"}` });
}
const CROSS_Z = [16, 24];
for (const [x, n] of [[-121, 1], [-201, 2]]) for (const [y0, y1, j] of [[-78, -TUNNEL.d / 2, 0], [-TUNNEL.d / 2, TUNNEL.d / 2, 1], [TUNNEL.d / 2, 78, 2]]) box(x - 5, y0, x + 5, y1, CROSS_Z[0], CROSS_Z[1], { tone: "lo" }, { owner: BODY, name: `body.cross${n}.${j}` });
longBox(TUNNEL.x, TUNNEL.y, TUNNEL.x + TUNNEL.w, TUNNEL.y + TUNNEL.d, TUNNEL.z0, TUNNEL.z1, { tone: "mid" }, { owner: BODY, name: "body.tunnel", bevel: 0.6, r: TUNNEL.r, seg: 50 });
box(70, -58, 76, 58, 66, 71, { tone: "mid" }, { owner: BODY, name: "body.radtop" });
box(70, -58, 76, 58, 10, 15, { tone: "mid" }, { owner: BODY, name: "body.radbottom" });
longBox(92, -72, 99, 72, 56, 68, { tone: "mid" }, { owner: BODY, name: "body.bumperF", bevel: 0.5, r: 2, seg: 48 });
for (const side of [1, -1]) box(RAIL.x1, Math.min(side * RAIL.y0, side * RAIL.y1), 92, Math.max(side * RAIL.y0, side * RAIL.y1), 58, 66, { tone: "lo" }, { owner: BODY, name: `body.crushbox${side > 0 ? "L" : "R"}` });
longBox(-379, -72, -372, 72, RRAIL.z0, RRAIL.z1 + 2, { tone: "mid" }, { owner: BODY, name: "body.bumperR", bevel: 0.5, r: 2, seg: 48 });
longBox(-304, -40, -296, 40, RRAIL.z0, RRAIL.z1, { tone: "lo" }, { owner: BODY, name: "body.rearcross", seg: 40 });
// firewall, in pieces so the column and the shift cable have real holes through it
{
  const yHoleCol = COLUMN.through[1], zCol = COLUMN.through[2];
  const yCab = 26, zCab = 56;
  const pieces = [
    [-FIRE.y, 0, FIRE.z0, FIRE.z1],
    [0, yCab - 4, FIRE.z0, FIRE.z1],
    [yCab - 4, yCab + 4, FIRE.z0, zCab - 4],
    [yCab - 4, yCab + 4, zCab + 4, FIRE.z1],
    [yCab + 4, yHoleCol - 5, FIRE.z0, FIRE.z1],
    [yHoleCol - 5, yHoleCol + 5, FIRE.z0, zCol - 5],
    [yHoleCol - 5, yHoleCol + 5, zCol + 5, FIRE.z1],
    [yHoleCol + 5, 58, FIRE.z0, FIRE.z1],
    [58, FIRE.y, FIRE.z0, FIRE.z1],
  ];
  const grommets = [[yCab, zCab, 4], [yHoleCol, zCol, 5]].map(([y, z, r]) => Ln(G.circleOf(G.frameAlong([FIRE.x, y, z], [1, 0, 0]), 0, r, P) + G.circleOf(G.frameAlong([FIRE.x, y, z], [1, 0, 0]), 0, r - 1.2, P), { tone: "lo" })).join("");
  const spans = [[-FIRE.y, 0], [0, 58], [58, FIRE.y]];
  spans.forEach(([ya, yb], j) => {
    const svg = S(k.slabOf({ x: FIRE.x - FIRE.t, y: ya, w: FIRE.t, d: yb - ya, r: 0.5 }, FIRE.z0, FIRE.z1 - FIRE.z0, P, 2), { tone: "mid" }) + (j === 1 ? grommets : "");
    const shapes = pieces.filter(([y0, y1]) => y0 >= ya - 0.01 && y1 <= yb + 0.01).map(([y0, y1, z0, z1], i) => record(A.box([FIRE.x - FIRE.t, y0, z0], [FIRE.x, y1, z1], { name: `body.firewall.${j}.${i}`, owner: BODY })));
    put([FIRE.x - 1.5, (ya + yb) / 2, 55], svg, { owner: BODY, name: `body.firewall.${j}`, shapes });
  });
}
// brake booster and master cylinder on the firewall's engine side
{
  const BF = G.frameAlong([FIRE.x, 50, 82], [1, 0, 0]);
  turned(BF, [[0, 11], [3, 12.5, 1], [9, 12.5, 1], [12, 9]], { tone: "mid" }, { owner: "brake", name: "brake.booster", smooth: { rows: 3 } });
  discAt(BF, 12, 30, 3.2, { tone: "mid" }, { owner: "brake", name: "brake.master" });
  box(FIRE.x + 16, 47, FIRE.x + 28, 53, 85, 96, { tone: "hi" }, { owner: "brake", name: "brake.reservoir", bevel: 0.4 });
}

// ---------------- front subframe, suspension, steering ----------------
const SUB = "subframe";
box(SUBF.x0, -SUBF.yOut, SUBF.x0 + 10, SUBF.yOut, SUBF.z0, SUBF.z1, { tone: "mid" }, { owner: SUB, name: "subframe.rear" });
box(SUBF.x1 - 10, -SUBF.yOut, SUBF.x1, SUBF.yOut, SUBF.z0, SUBF.z1, { tone: "mid" }, { owner: SUB, name: "subframe.front" });
const SWAY = { x: -38, z: 24, zEnd: 30, r: 1.3 };
for (const side of [1, -1]) {
  const [y0, y1] = side > 0 ? [SUBF.yIn, SUBF.yOut] : [-SUBF.yOut, -SUBF.yIn];
  box(SUBF.x0 + 10, y0, SUBF.x1 - 10, y1, SUBF.z0, SUBF.z1, { tone: "mid" }, { owner: SUB, name: `subframe.side${side > 0 ? "L" : "R"}` });
  // lower control arm: a triangle in plan from two bushes on the side rail to the ball joint under the knuckle
  const ZF = G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const yb = side * (SUBF.yOut + 0.1);
  const poly = [[-24, yb], [4, yb], [0, side * (KNUCKLE_Y + 1)]];
  prismAt(ZF, poly, 20, 24.5, { tone: "mid" }, { owner: "susp", name: `susp.lca${side > 0 ? "L" : "R"}` });
  for (const x of [-21, 1]) discAt(G.frameAlong([x, side * SUBF.yOut, 22.2], [0, side, 0]), 0.01, 5, 2.2, { tone: "mid" }, { owner: "susp", name: `susp.lcabush${side > 0 ? "L" : "R"}${x}` });
  ballAt([0, side * (KNUCKLE_Y + 1), 26.9], 2.4, { tone: "mid" }, { owner: "susp", name: `susp.balljoint${side > 0 ? "L" : "R"}` });
  // strut: stands on the knuckle, runs up into the tower; spring around it under the tower
  const sx = 0, sy = side * STRUT_Y, sz = 49;
  const SF = G.frameAlong([sx, sy, sz], [0, 0, 1]);
  turned(SF, [[0, 3.2], [18, 3.2], [18, 2.6], [TOWER.z0 - sz + 1, 2.6], [TOWER.z0 - sz + 1, 1.3], [TOWER.z1 - sz + 1, 1.3]], { tone: "hi" }, { owner: "susp", name: `susp.strut${side > 0 ? "L" : "R"}`, inner: Ln(G.arcOf(SF, 3, 3.2, P) + G.arcOf(SF, 13, 3.2, P), { tone: "faint" }) });
  discAt(SF, TOWER.z1 - sz + 1, TOWER.z1 - sz + 3, 2.2, { tone: "mid" }, { owner: "susp", name: `susp.topnut${side > 0 ? "L" : "R"}` });
  put(G.pointOf(SF, TOWER.z0 - sz + 1, 0, 0), S(G.ringBand(TOWER.z0 - sz + 0.2, TOWER.z0 - sz + 1.6, 2.7, 7.6, SF, P), { tone: "mid" }), { owner: "susp", name: `susp.seat${side > 0 ? "L" : "R"}`, shapes: [record(A.ring(SF, TOWER.z0 - sz + 0.2, TOWER.z0 - sz + 1.6, 2.7, 7.6, { name: `susp.seat${side > 0 ? "L" : "R"}`, owner: "susp" }))] });
  const coilShape = record(A.ring(SF, TOWER.z0 - sz + 1.6, TOWER.z1 - sz - 2.4, 6.4, 7.4, { name: `susp.coil${side > 0 ? "L" : "R"}`, owner: "susp" }));
  const coil = X.coilZ(sx, sy, 7.2, TOWER.z0 + 1.7, TOWER.z1 - 2.5, 4.5);
  put([sx, sy, TOWER.z0 + 8], Ln(coil.back, { tone: "lo" }), { owner: "susp", name: `susp.coilback${side > 0 ? "L" : "R"}`, bias: -3.5, shapes: [coilShape] });
  put([sx, sy, TOWER.z0 + 8], Ln(coil.front, { tone: "mid" }), { owner: "susp", name: `susp.coilfront${side > 0 ? "L" : "R"}`, bias: -0.5, shapes: [coilShape] });
  // sway bar end link: a ball on the bar's end, a ball on a lug of the strut, the link between them
  const lowBall = [SWAY.x, side * 60, SWAY.zEnd], highBall = [-4.2, side * (STRUT_Y - 1.8), 56];
  ballAt(lowBall, 1.7, {}, { owner: "susp", name: `susp.linklow${side > 0 ? "L" : "R"}` });
  ballAt(highBall, 1.7, {}, { owner: "susp", name: `susp.linkhigh${side > 0 ? "L" : "R"}` });
  tubeAt([rimOn(lowBall, 1.7, 0.9, highBall), rimOn(highBall, 1.7, 0.9, lowBall)], 0.9, { owner: "susp", name: `susp.link${side > 0 ? "L" : "R"}`, tone: "mid" });
}
// sway bar across the back of the subframe, in two bushes on brackets off the rear cross member
{
  const route = [rimOn([SWAY.x, -60, SWAY.zEnd], 1.7, SWAY.r, [SWAY.x, -40, SWAY.z]), [SWAY.x, -40, SWAY.z], [SWAY.x, 40, SWAY.z], rimOn([SWAY.x, 60, SWAY.zEnd], 1.7, SWAY.r, [SWAY.x, 40, SWAY.z])];
  const line = G.fillet(route, 6, 10, { P, tube: SWAY.r });
  const gaps = [-30, 30].flatMap((y) => T.crossingsOf(line, [SWAY.x, y, SWAY.z], [0, 1, 0], 2.6).map((at) => [at - 2, at + 2]));
  tubeAt(route, SWAY.r, { owner: "susp", name: "susp.swaybar", tone: "mid", bend: 4, gaps, caps: true });
  for (const y of [-30, 30]) {
    discAt(G.frameAlong([SWAY.x, y - 2, SWAY.z], [0, 1, 0]), 0, 4, 2.6, { tone: "mid" }, { owner: "susp.swaybar", name: `susp.bush${y > 0 ? "L" : "R"}` });
    box(SWAY.x + 2.6, y - 2.4, SUBF.x0, y + 2.4, SUBF.z0, SUBF.z1, { tone: "mid" }, { owner: "susp", name: `susp.bushbracket${y > 0 ? "L" : "R"}` });
  }
}
// steering rack behind the axle, boots at both ends, pinion housing on the left
{
  const RF = G.frameAlong([RACK.x, -RACK.y, RACK.z], [0, 1, 0]);
  turned(RF, [[0, 3.6], [6, 3.8, 1], [10, 2.6], [RACK.y * 2 - 10, 2.6], [RACK.y * 2 - 6, 3.8, 1], [RACK.y * 2, 3.6]], { tone: "hi" }, { owner: "steer", name: "steer.rack", smooth: { rows: 3 }, inner: Ln([26, 52, 78].map((s) => G.arcOf(RF, s, 2.6, P)).join(""), { tone: "faint" }) });
  for (const y of [-30, 30]) box(RACK.x - 3.5, y - 3, RACK.x + 3.5, y + 3, SUBF.z1, RACK.z - RACK.r + 0.2, { tone: "mid" }, { owner: "steer", name: `steer.mount${y > 0 ? "L" : "R"}` });
  // pinion housing, and the intermediate shaft up to the firewall with two universal joints
  const pinion = [RACK.x - 2, RACK.pinionY, RACK.z + 2];
  const PF = G.frameAlong(pinion, G.unit3(G.sub3(COLUMN.through, pinion)));
  discAt(PF, 0, 9, 4, { tone: "mid" }, { owner: "steer", name: "steer.pinion" });
  ballAt(G.pointOf(PF, 11, 0, 0), 2.2, {}, { owner: "steer", name: "steer.ujoint1" });
  const ujoint2 = G.pointOf(PF, G.len3(G.sub3(COLUMN.through, pinion)) - 6, 0, 0);
  discAt(PF, 13, G.len3(G.sub3(COLUMN.through, pinion)) - 8, 1.5, { tone: "hi" }, { owner: "steer", name: "steer.intershaft" });
  ballAt(ujoint2, 2.2, {}, { owner: "steer", name: "steer.ujoint2" });
  discAt(PF, G.len3(G.sub3(COLUMN.through, pinion)) - 4, G.len3(G.sub3(COLUMN.through, pinion)) + 1, 1.5, { tone: "hi" }, { owner: "steer", name: "steer.stub" });
}
// steering column: tube from the firewall to the hub, the EPS motor beside it, the wheel
{
  const CF = LAYOUT.column.frame; // origin at the hub, axis toward the driver
  const len = G.len3(G.sub3(COLUMN.hub, COLUMN.through));
  const sPlate = -len + FIRE.t / Math.abs(columnAxis[0]); // where the axis leaves the firewall's cabin face
  turned(CF, [[sPlate, 2.2], [-len + 12, 2.2], [-len + 12, 3.2], [-len + 40, 3.2], [-len + 40, 2.4], [-1, 2.4]], { tone: "mid" }, { owner: "steer", name: "steer.column", inner: Ln(G.arcOf(CF, -len + 26, 3.2, P), { tone: "faint" }) });
  turned(CF, [[-len - 1, 2.2], [sPlate, 2.2]], { tone: "mid" }, { owner: "steer", name: "steer.columnstub" });
  // EPS motor: a can hanging below the column, in the bracket under the dash
  const motorC = G.pointOf(CF, -len + 30, 0, 0).map((c, i) => c + [0, 0, 1][i] * 6.4 + [0, 1, 0][i] * 3);
  const MF = G.frameAlong(motorC, [0, 1, 0]);
  turned(MF, [[0, 4.2], [1, 5.6], [10, 5.6], [10, 4.2], [12, 4.2]], { tone: "mid" }, { owner: "steer", name: "steer.eps", inner: k.fadedSvg(G.ribsOf(MF, 1, 10, 5.62, 16, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }) });
  box(motorC[0] - 3, motorC[1] - 4, motorC[0] + 3, motorC[1] - 2, motorC[2] - 9, motorC[2] - 4, { tone: "mid" }, { owner: "steer", name: "steer.epsbracket" });
  // the wheel: rim, hub, spokes (live)
  const rimId = "steer.rim";
  put(COLUMN.hub, S(G.ringBand(0, 2.6, 14.6, 17.2, CF, P), { tone: "hi" }), { owner: "steer", name: rimId, shapes: [record(A.ring(CF, 0, 2.6, 14.6, 17.2, { name: rimId, owner: "steer" }))] });
  discAt(CF, -1, 2.8, 4.8, { tone: "hi" }, { owner: "steer", name: "steer.hub" });
  put(G.pointOf(CF, 1.4, 0, 0), X.steeringWheel(0), { owner: "steer", name: "steer.spokes", part: "spokes", bias: 0.6, shapes: [record(A.disc(CF, 1, 1.8, 14.6, { name: "steer.spokes", owner: "steer" }))] });
}

// ---------------- powertrain ----------------
const ENG = "engine";
const E = ENGINE;
{
  boxAt({ x: E.x + 10, y: E.y + 6, w: 24, d: 36, r: 2 }, 38, 4, { tone: "lo" }, { owner: ENG, name: "engine.pan", steps: 3 });
  boxAt({ x: E.x, y: E.y, w: E.w, d: E.d, r: 1.5 }, 42, 30, { tone: "mid" }, { owner: ENG, name: "engine.block", steps: 3, inner: Ln(k.sideSeam({ x: E.x, y: E.y, w: E.w, d: E.d, r: 1.5 }, 60, P, 3), { tone: "faint" }) });
  boxAt({ x: E.x, y: E.y, w: E.w, d: E.d, r: 1.5 }, 72, 18, { tone: "mid" }, { owner: ENG, name: "engine.head", steps: 3 });
  boxAt({ x: E.x + 3, y: E.y + 3, w: E.w - 6, d: E.d - 6, r: 4 }, 90, 8, { tone: "hi" }, { owner: ENG, name: "engine.cover", steps: 5, bevel: 0.8, extra: screws([-40, -24, -8].flatMap((y) => [[E.x + 9, y, 98], [E.x + E.w - 9, y, 98]])) + S(k.cylinder(E.x + 12, E.y + 12, 3.4, 98, 2.2, P, 20), { tone: "mid" }) + Ln(k.knurl(E.x + 12, E.y + 12, 3.4, 98, 100.2, 18, P), { tone: "lo" }) });
  record(A.cylinder(E.x + 12, E.y + 12, 3.4, 98, 2.2, { name: "engine.oilcap", owner: ENG }));
  // ignition coil pack along the cover, oil filter on the block's front face, starter under the intake, thermostat housing at the left end of the head
  boxAt({ x: E.x + 16, y: E.y + 6, w: 8, d: 46, r: 1.5 }, 98, 3, { tone: "mid" }, { owner: ENG, name: "engine.coils", steps: 3, extra: screws([-42, -30, -18, -6].map((y) => [E.x + 20, y, 101]), 0.5) });
  const OF = G.frameAlong([E.x + E.w, E.y + 48, 52], [1, 0, 0]);
  turned(OF, [[0, 3], [1.5, 4.2], [9, 4.2, 1], [10.5, 3.2]], { tone: "hi" }, { owner: ENG, name: "engine.oilfilter", smooth: { rows: 3 }, inner: k.fadedSvg(G.ribsOf(OF, 5.5, 9, 4.21, 20, P, { fade: [0.1, 0.55], seams: "first" }), { tone: "lo" }) });
  const STF = G.frameAlong([E.x + E.w, E.y + 24, 46], [1, 0, 0]);
  turned(STF, [[0, 4], [8, 4], [8, 2.6], [13, 2.6]], { tone: "mid" }, { owner: ENG, name: "engine.starter", inner: Ln(G.arcOf(STF, 4, 4, P), { tone: "faint" }) });
  const THF = G.frameAlong([E.x + E.w - 10, E.y + E.d, 88], [0, 1, 0]);
  turned(THF, [[0, 3.6], [3, 3.6], [3, 2.4], [8, 2.4]], { tone: "mid" }, { owner: "cool", name: "cool.thermostat" });
  const WPF = G.frameAlong([E.x + E.w, -40, 50], [1, 0, 0]);
  turned(WPF, [[0, 4], [2, 4], [2, 2.4], [5, 2.4]], { tone: "mid" }, { owner: "cool", name: "cool.pumpinlet" });
  // intake manifold on the front face with four runners, throttle body at its left end
  boxAt({ x: E.x + E.w, y: E.y + 4, w: 12, d: E.d - 4, r: 2 }, 62, 16, { tone: "mid" }, { owner: ENG, name: "engine.intake", steps: 3 });
  for (const y of [-36, -26, -16, -6]) {
    const RF = G.frameAlong([E.x + E.w + 12, y, 76], [0.3, 0, 1]);
    turned(RF, [[0, 3.2], [10, 3.2]], { tone: "mid" }, { owner: ENG, name: `engine.runner${y}` });
  }
  const TB = G.frameAlong([E.x + E.w + 6, E.y + E.d, 70], [0, 1, 0]);
  discAt(TB, 0, 5, 4.2, { tone: "mid" }, { owner: ENG, name: "engine.throttle", inner: Ln(G.circleOf(TB, 5, 3, P), { tone: "faint" }) });
  // exhaust manifold with the catalyst on the rear face, downpipe out of its bottom
  boxAt({ x: E.x - 12, y: E.y + 6, w: 12, d: 44, r: 2 }, 64, 16, { tone: "mid" }, { owner: "exhaust", name: "exhaust.manifold", steps: 3, inner: Ln([-42, -30, -18].map((y) => k.segment([E.x - 12, y, 64], [E.x - 12, y, 80], P)).join(""), { tone: "faint" }) });
  discAt(G.frameAlong([E.x - 6, E.y + 24, 64], [0, 0, -1]), 0, 2, 4.2, { tone: "mid" }, { owner: "exhaust", name: "exhaust.flange" });
  // crank pulley and alternator on the right end, with the belt
  const CF = G.frameAlong([CRANK[0], E.y, CRANK[1]], [0, -1, 0]);
  turned(CF, [[0, 4], [1, 6.5], [4, 6.5], [4, 5], [5.5, 5]], { tone: "hi" }, { owner: ENG, name: "engine.pulley", inner: Ln(G.arcOf(CF, 2.5, 6.5, P), { tone: "faint" }) });
  const AF = G.frameAlong([E.x + 30, E.y, 84], [0, -1, 0]);
  turned(AF, [[0, 4.5], [3, 6.5], [12, 6.5], [12, 4.5], [14, 4.5]], { tone: "mid" }, { owner: ENG, name: "engine.alternator", inner: k.fadedSvg(G.ribsOf(AF, 3, 12, 6.52, 18, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }) });
  discAt(AF, -1, 3, 4, { tone: "hi" }, { owner: ENG, name: "engine.altpulley" });
  box(E.x + 26, E.y - 1, E.x + 34, E.y + 3, 74, 80, { tone: "mid" }, { owner: ENG, name: "engine.altbracket" });
  // belt: tangent lines between the two pulleys on the plane just outside their faces
  {
    const a = [CRANK[0], CRANK[1]], b = [E.x + 30, 84], ra = 6.5, rb = 4;
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const base = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const off = Math.acos((ra - rb) / d);
    const lines = [base + off, base - off].map((ang) => k.segment([a[0] + ra * Math.cos(ang), E.y - 2.5, a[1] + ra * Math.sin(ang)], [b[0] + rb * Math.cos(ang), E.y - 2.5, b[1] + rb * Math.sin(ang)], P)).join("");
    put([E.x + 20, E.y - 2.5, 66], Ln(lines, { tone: "hi" }), { owner: ENG, name: "engine.belt", bias: 0.3, shapes: [record(A.box([a[0] - ra, E.y - 2.8, a[1] - ra], [b[0] + rb, E.y - 2.2, b[1] + rb], { name: "engine.belt", owner: ENG }))] });
  }
  // transaxle: bell housing along the crank axis, the case box, its end cover, the differential bulge
  const BF = G.frameAlong([CRANK[0], BELL.y0, CRANK[1]], [0, 1, 0]);
  turned(BF, [[0, 20], [3, 20], [12, 17, 1], [BELL.y1 - BELL.y0, 15.5]], { tone: "mid" }, { owner: "trans", name: "trans.bell", smooth: { rows: 3 }, extra: Dots(G.dotsOf(BF, 1.5, 19, 10, P, { fade: [0.04, 0.42] }), { size: 0.45, tone: "mid" }) });
  boxAt({ x: CASE.x, y: CASE.y, w: CASE.w, d: CASE.d, r: CASE.r }, CASE.z0, CASE.z1 - CASE.z0, { tone: "mid" }, { owner: "trans", name: "trans.case", steps: 4, bevel: 0.6, inner: Ln(k.sideSeam({ x: CASE.x, y: CASE.y, w: CASE.w, d: CASE.d, r: CASE.r }, 50, P, 4), { tone: "faint" }), extra: screws([[-16, 62, 78], [-2, 62, 78], [12, 62, 78], [-16, 62, 36], [12, 62, 36]], 0.4) });
  boxAt({ x: CASE.x + 8, y: CASE.y + CASE.d, w: CASE.w - 16, d: 3, r: 5 }, CASE.z0, 44, { tone: "mid" }, { owner: "trans", name: "trans.cover", steps: 5 });
  const DF = G.frameAlong([XF, 4, TR], [0, 1, 0]);
  turned(DF, [[0, 7], [2, 11.5], [CASE.y - 4, 11.5], [CASE.y - 4, 9]], { tone: "mid" }, { owner: "trans", name: "trans.diff", inner: Ln(G.arcOf(DF, 6, 11.5, P), { tone: "faint" }) });
  // the internal mode switch boss on top of the case, the manual shaft out of its left face
  boxAt({ x: IMS.x, y: IMS.y, w: IMS.w, d: IMS.d, r: 1.5 }, IMS.z0, IMS.z1 - IMS.z0, { tone: "hi" }, { owner: "trans", name: "trans.ims", steps: 3, bevel: 0.4, extra: screws([[IMS.x + 2.5, IMS.y + 2.5, IMS.z1], [IMS.x + IMS.w - 2.5, IMS.y + IMS.d - 2.5, IMS.z1]], 0.4) });
  const MF = G.frameAlong([MANUAL.shaftEnd[0], IMS.y + IMS.d, MANUAL.shaftEnd[2]], [0, 1, 0]);
  const shaftLen = MANUAL.shaftEnd[1] - IMS.y - IMS.d;
  discAt(MF, 0, shaftLen - 1.7, 1.1, { tone: "hi" }, { owner: "trans", name: "trans.manualshaft" });
  discAt(MF, shaftLen - 2.7, shaftLen - 1.1, 1.8, { tone: "mid" }, { owner: "trans", name: "trans.nut" });
  // transmission mount: an arm off the end cover across to a pad on the rail
  box(14, COVER_Y, 20, RAIL.y0, 62, 70, { tone: "mid" }, { owner: "trans", name: "trans.mountarm" });
  box(14, RAIL.y0, 22, RAIL.y1, RAIL.z1, 72, { tone: "mid" }, { owner: "trans", name: "trans.mountpad" });
  // engine mount: a bracket off the block's right face to a pad on the right rail
  box(20, -RAIL.y0, 28, E.y, 68, 75, { tone: "mid" }, { owner: ENG, name: "engine.mountarm" });
  box(18, -RAIL.y1, 30, -RAIL.y0, RAIL.z1, 72, { tone: "mid" }, { owner: ENG, name: "engine.mountpad" });
  // air box on the left front corner with its intake tube to the throttle, battery on the right
  const AIR = { x: 36, y: 22, w: 24, d: 24, r: 3 };
  boxAt(AIR, 70, 20, { tone: "mid" }, { owner: ENG, name: "engine.airbox", steps: 4, bevel: 0.6, inner: Ln(k.sideSeam(AIR, 80, P, 4), { tone: "faint" }) });
  box(AIR.x + 6, 40, AIR.x + 18, RAIL.y0 + 3, RAIL.z1, 70, { tone: "lo" }, { owner: ENG, name: "engine.airboxfoot" });
  const neckF = G.frameAlong([AIR.x + 12, AIR.y, 78], [0, -1, 0]);
  discAt(neckF, 0, 3, 4.2, { tone: "mid" }, { owner: ENG, name: "engine.airneck" });
  tubeAt([[AIR.x + 12, AIR.y - 3, 78], [AIR.x + 12, AIR.y - 8, 78], [E.x + E.w + 6, E.y + E.d + 11, 70], [E.x + E.w + 6, E.y + E.d + 5.01, 70]], 3.6, { owner: ENG, name: "engine.intaketube", tone: "mid", bend: 2, maxLength: 14 });
  boxAt({ x: 36, y: -70, w: 18, d: 22, r: 1.5 }, 70, 18, { tone: "mid" }, { owner: ENG, name: "engine.battery", steps: 3, bevel: 0.5, extra: screws([[40, -64, 88], [50, -54, 88]], 0.7) });
  box(36, -70, 54, -RAIL.y0, RAIL.z1, 70, { tone: "lo" }, { owner: ENG, name: "engine.batterytray" });
}
// radiator, fan shroud, fan (live), hoses
{
  boxAt({ x: 60, y: -56, w: 5, d: 112, r: 1 }, 15, 39, { tone: "mid" }, { owner: "cool", name: "cool.radiator", steps: 2, inner: Ln([24, 34, 44].map((z) => k.sideSeam({ x: 60, y: -56, w: 5, d: 112, r: 1 }, z, P, 2)).join(""), { tone: "faint" }) });
  box(65, -58, 68, 58, 54, 58, { tone: "hi" }, { owner: "cool", name: "cool.tanktop" });
  boxAt({ x: 50, y: -31, w: 10, d: 39.5, r: 2 }, 18, 44, { tone: "mid" }, { owner: "cool", name: "cool.shroud", steps: 3 });
  const FF = LAYOUT.fan.frame;
  put(FAN.c, Ln(G.circleOf(FF, 0.6, FAN.r, P), { tone: "lo" }) + X.fanBlades(0) + S(G.disc(0, 2.4, 3.4, FF, P), { tone: "mid" }), { owner: "cool", name: "cool.fan", part: "fan", bias: 0.4, shapes: [record(A.disc(FF, 0, 2.4, FAN.r, { name: "cool.fan", owner: "cool" }))] });
  discAt(G.frameAlong([60, 12, 50], [-1, 0, 0]), 0, 3, 2.7, { tone: "mid" }, { owner: "cool", name: "cool.neckupper" });
  discAt(G.frameAlong([60, -40, 22], [-1, 0, 0]), 0, 3, 2.7, { tone: "mid" }, { owner: "cool", name: "cool.necklower" });
  tubeAt([[57, 12, 50], [54, 12, 50], [54, 12, 88], [E.x + E.w - 10, E.y + E.d + 20, 88], [E.x + E.w - 10, E.y + E.d + 8.01, 88]], 2.1, { owner: "cool", name: "cool.upperhose", tone: "mid", bend: 3, maxLength: 14 });
  tubeAt([[57, -40, 22], [50, -40, 22], [50, -40, 50], [E.x + E.w + 5.01, -40 + 0.001, 50]], 2.1, { owner: "cool", name: "cool.lowerhose", tone: "mid", bend: 3, maxLength: 14 });
}
// ---------------- driveline ----------------
for (const side of [1, -1]) {
  const hubFace = side * (YF + X.K.ks[0]); // the knuckle's inboard face
  if (side < 0) {
    // intermediate shaft out of the differential, through a bearing bracket under the block, to the inner joint
    turned(G.frameAlong([XF, BELL.y0 + 0.01, TR], [0, -1, 0]), [[0, 1.7], [BELL.y0 + 36, 1.7]], { tone: "hi" }, { owner: "drive", name: "drive.intershaft" });
    discAt(G.frameAlong([XF, -34, TR], [0, 1, 0]), 0, 4, 3.4, { tone: "mid" }, { owner: "drive", name: "drive.bearing" });
    box(XF - 2, -35, XF + 2, -31, TR + 3.4, 42, { tone: "mid" }, { owner: "drive", name: "drive.bearingbracket" });
    turned(G.frameAlong([XF, -36, TR], [0, -1, 0]), [[0, 4], [3, 4.6], [7, 4.6, 1], [11, 2.4]], { tone: "mid" }, { owner: "drive", name: "drive.innerjointR", smooth: { rows: 3 } });
    turned(G.frameAlong([XF, -47, TR], [0, -1, 0]), [[0, 1.7], [-hubFace - 7 - 47, 1.7]], { tone: "hi" }, { owner: "drive", name: "drive.halfshaftR" });
  } else {
    const y0 = COVER_Y;
    turned(G.frameAlong([XF, y0, TR], [0, 1, 0]), [[0, 4], [3, 4.6], [7, 4.6, 1], [10, 2.4]], { tone: "mid" }, { owner: "drive", name: "drive.innerjointL", smooth: { rows: 3 } });
    turned(G.frameAlong([XF, y0 + 10, TR], [0, 1, 0]), [[0, 1.7], [hubFace - y0 - 10 - 7, 1.7]], { tone: "hi" }, { owner: "drive", name: "drive.halfshaftL" });
  }
  // outer joint boot, its stub into the hub bearing
  turned(G.frameAlong([XF, hubFace - side * 7, TR], [0, side, 0]), [[0, 2.4], [4, 4.4, 1], [6, 4.4], [6, 3], [7, 3]], { tone: "mid" }, { owner: `wheel.${side > 0 ? "FL" : "FR"}`, name: `drive.outerjoint${side > 0 ? "L" : "R"}`, smooth: { rows: 3 } });
}

// ---------------- rear axle: twist beam, trailing arms, springs, shocks, Watts link ----------------
const REAR = "rear";
for (const side of [1, -1]) {
  const y = side * 58.5;
  const [y0, y1] = [y - 3.5, y + 3.5];
  box(-238, y0, -204, y1, 30, 38, { tone: "mid" }, { owner: REAR, name: `rear.arm${side > 0 ? "L" : "R"}`, bevel: 0.4 });
  box(XR + 5, y0, -248, y1, 30, 38, { tone: "mid" }, { owner: REAR, name: `rear.armrear${side > 0 ? "L" : "R"}`, bevel: 0.4 });
  // pivot bush and its bracket on the sill
  discAt(G.frameAlong([-206, side * 50, 34], [0, side, 0]), 0, 16, 3.2, { tone: "mid" }, { owner: REAR, name: `rear.bush${side > 0 ? "L" : "R"}` });
  box(-212, Math.min(side * 62, side * 78), -200, Math.max(side * 62, side * 78), 30, 38, { tone: "mid" }, { owner: REAR, name: `rear.pivotbracket${side > 0 ? "L" : "R"}` });
  // hub carrier plate at the arm's end
  box(XR - 5, Math.min(side * 54, side * (YR + X.K.ks[0] - 0.05)), XR + 5, Math.max(side * 54, side * (YR + X.K.ks[0] - 0.05)), 22, 46, { tone: "mid" }, { owner: REAR, name: `rear.plate${side > 0 ? "L" : "R"}` });
  // spring seat on the arm inboard of the hub, coil up to the rail
  const sx = -254, sy = side * 50;
  box(sx - 9, Math.min(side * 44, side * 62), sx + 9, Math.max(side * 44, side * 62), 38, 40, { tone: "mid" }, { owner: REAR, name: `rear.seat${side > 0 ? "L" : "R"}` });
  const coil = X.coilZ(sx, sy, 7.4, 40.3, RRAIL.z0 - 0.3, 5);
  const CF = G.frameAlong([sx, sy, 40], [0, 0, 1]);
  const rcoil = record(A.disc(CF, 0, RRAIL.z0 - 40, 7.4, { name: `rear.coil${side > 0 ? "L" : "R"}`, owner: REAR }));
  put([sx, sy, 48], Ln(coil.back, { tone: "lo" }), { owner: REAR, name: `rear.coilback${side > 0 ? "L" : "R"}`, bias: -3, shapes: [rcoil] });
  put([sx, sy, 48], Ln(coil.front, { tone: "mid" }), { owner: REAR, name: `rear.coilfront${side > 0 ? "L" : "R"}`, bias: 3, shapes: [rcoil] });
  // shock absorber from behind the hub up to the rail's outer face
  const lo = [XR - 7.2, side * 56, 40], hi = [XR - 18, side * 54, RRAIL.z1];
  const SF = G.frameAlong(lo, G.unit3(G.sub3(hi, lo)));
  const len = G.len3(G.sub3(hi, lo));
  turned(SF, [[0, 2.6], [len * 0.55, 2.6], [len * 0.55, 1], [len - 1, 1]], { tone: "hi" }, { owner: REAR, name: `rear.shock${side > 0 ? "L" : "R"}`, inner: Ln(G.arcOf(SF, 4, 2.6, P), { tone: "faint" }) });
  ballAt(lo, 2.2, {}, { owner: REAR, name: `rear.shocklow${side > 0 ? "L" : "R"}` });
  box(hi[0] - 3, Math.min(side * 52, side * 56), hi[0] + 3, Math.max(side * 52, side * 56), RRAIL.z1 - 2, RRAIL.z1 + 3, { tone: "mid" }, { owner: REAR, name: `rear.shocktop${side > 0 ? "L" : "R"}` });
}
longBox(-248, -62.5, -238, 62.5, 30, 38, { tone: "mid" }, { owner: REAR, name: "rear.beam", bevel: 0.4, seg: 42, inner: (plan) => Ln(k.sideSeam(plan, 34, P, 3), { tone: "faint" }) });
// Watts Z-link: a centre crank pivoting on the back of the beam, two lateral rods to brackets on the body
{
  const CX = -251.4;
  const LF = G.frameAlong([CX, 0, 22], [0, 0, 1]);
  prismAt(LF, [[-2.2, -0.8], [2.2, -0.8], [2.2, 0.8], [-2.2, 0.8]], 0, 24, { tone: "hi" }, { owner: REAR, name: "rear.wattscrank" });
  ballAt([-250.2, 0, 34], 2.2, {}, { owner: REAR, name: "rear.wattspivot" });
  const BX = CX - 2.7;
  const top = [BX, 0, 45], bottom = [BX, 0, 23], bl = [BX, 38.1, 45], br = [BX, -38.1, 23];
  ballAt(top, 1.9, {}, { owner: REAR, name: "rear.wattstop" });
  ballAt(bottom, 1.9, {}, { owner: REAR, name: "rear.wattsbottom" });
  ballAt(bl, 1.9, {}, { owner: REAR, name: "rear.wattsballL" });
  ballAt(br, 1.9, {}, { owner: REAR, name: "rear.wattsballR" });
  tubeAt([rimOn(top, 1.9, 1.1, bl), rimOn(bl, 1.9, 1.1, top)], 1.1, { owner: REAR, name: "rear.wattsupper", tone: "hi" });
  tubeAt([rimOn(bottom, 1.9, 1.1, br), rimOn(br, 1.9, 1.1, bottom)], 1.1, { owner: REAR, name: "rear.wattslower", tone: "hi" });
  box(-254.4, 40, -244, 48, 40, 50, { tone: "mid" }, { owner: REAR, name: "rear.wattsbracketL" });
  box(-254.4, -48, -244, -40, 18, 28, { tone: "mid" }, { owner: REAR, name: "rear.wattsbracketR" });
}
// fuel tank on the left ahead of the beam, filler neck up to the left quarter
const TANK = { x: -234, y: 14, w: 26, d: 24, r: 4 };
boxAt(TANK, 18, 24, { tone: "mid" }, { owner: "fuel", name: "fuel.tank", steps: 4, bevel: 0.6, inner: Ln(k.sideSeam(TANK, 30, P, 4), { tone: "faint" }) });
for (const x of [-229, -213]) box(x - 1.5, TUNNEL.d / 2 + 1, x + 1.5, 40, 16, 18, { tone: "lo" }, { owner: "fuel", name: `fuel.strap${x}` });
const NECK_AX = G.unit3([0.2, 0.72, 0.66]), NECK0 = [-221, 32, 42];
discAt(G.frameAlong(NECK0, NECK_AX), 0, 3, 2.2, { tone: "mid" }, { owner: "fuel", name: "fuel.neck" });
const FILL_END = [-214, 82, 56], FILL_AX = G.unit3([-0.2, 0.84, 0.5]);
tubeAt([G.add3(NECK0, G.mul3(NECK_AX, 3)), G.add3(NECK0, G.mul3(NECK_AX, 14)), [-212, 66, 56], G.sub3(FILL_END, G.mul3(FILL_AX, 7)), G.sub3(FILL_END, G.mul3(FILL_AX, 0.01))], 1.6, { owner: "fuel", name: "fuel.filler", tone: "mid", bend: 5, maxLength: 14 });
discAt(G.frameAlong(FILL_END, FILL_AX), 0, 2, 2.6, { tone: "mid" }, { owner: "fuel", name: "fuel.fillercap" });

// ---------------- exhaust ----------------
{
  const EX = "exhaust";
  const EY = E.y + 24, EZ = 11;
  const down = [[E.x - 6, EY, 62], [E.x - 6, EY, 38], [-56, EY, 38], [-60, EY, EZ], [-66, EY, EZ]];
  tubeAt(down, 2.8, { owner: EX, name: "exhaust.downpipe", tone: "mid", bend: 3, maxLength: 16 });
  const CF = G.frameAlong([-66, EY, EZ], [-1, 0, 0]);
  turned(CF, [[0, 2.8], [3, 5.5, 1], [26, 5.5, 1], [29, 2.8]], { tone: "mid" }, { owner: EX, name: "exhaust.cat", smooth: { rows: 3 }, inner: Ln(G.arcOf(CF, 8, 5.5, P) + G.arcOf(CF, 21, 5.5, P), { tone: "faint" }) });
  tubeAt([[-95, EY, EZ], [-104, EY, EZ], [-118, -26, EZ], [-150, -26, EZ]], 2.8, { owner: EX, name: "exhaust.mid1", tone: "mid", bend: 4, touch: ["exhaust.hanger*"] });
  const RF = G.frameAlong([-150, -26, EZ], [-1, 0, 0]);
  turned(RF, [[0, 2.8], [3, 5.4, 1], [30, 5.4, 1], [33, 2.8]], { tone: "mid" }, { owner: EX, name: "exhaust.resonator", smooth: { rows: 3 } });
  tubeAt([[-183, -26, EZ], [-282, -26, EZ], [-294, -22, 16], [-300, -22, 16]], 2.8, { owner: EX, name: "exhaust.mid2", tone: "mid", bend: 4, touch: ["exhaust.hanger*"] });
  const MF = G.frameAlong([-300, -22, 16], [-1, 0, 0]);
  turned(MF, [[0, 2.8], [3, 9, 1], [44, 9, 1], [47, 2.8]], { tone: "mid" }, { owner: EX, name: "exhaust.muffler", smooth: { rows: 3 }, inner: Ln(G.arcOf(MF, 12, 9, P) + G.arcOf(MF, 35, 9, P), { tone: "faint" }) });
  const TIP = [-384, -40, 22], TIP_AX = G.unit3([-16, -14, 4]);
  tubeAt([[-347, -22, 16], [-354, -22, 16], [-368, -26, 18], G.sub3(TIP, G.mul3(TIP_AX, 6)), G.sub3(TIP, G.mul3(TIP_AX, 0.01))], 2.8, { owner: EX, name: "exhaust.tail", tone: "mid", bend: 4 });
  discAt(G.frameAlong(TIP, TIP_AX), 0, 1.4, 3.6, { tone: "hi" }, { owner: EX, name: "exhaust.tip" });
  // hangers: rubber blocks from the floor cross members down onto the pipe
  for (const x of [-121, -201]) box(x - 1.5, -28, x + 1.5, -24, EZ + 2.8, CROSS_Z[0], { tone: "lo" }, { owner: EX, name: `exhaust.hanger${x}` });
}

// ---------------- the range selector chain: console lever, cable, manual lever ----------------
{
  const SH = SHIFTER;
  // bracket: a base plate on the tunnel with two side plates and the pivot pin
  boxAt({ x: SH.pivot[0] - 12, y: -7.5, w: 26, d: 15, r: 1.2 }, TUNNEL.z1, 1.5, { tone: "mid" }, { owner: "shift", name: "shift.base", steps: 3, extra: screws([[SH.pivot[0] - 10, -5.5, TUNNEL.z1 + 1.5], [SH.pivot[0] + 12, 5.5, TUNNEL.z1 + 1.5], [SH.pivot[0] - 10, 5.5, TUNNEL.z1 + 1.5], [SH.pivot[0] + 12, -5.5, TUNNEL.z1 + 1.5]], 0.4) });
  for (const side of [1, -1]) {
    const [y0, y1] = side > 0 ? [6.3, 7.5] : [-7.5, -6.3];
    // the gate: four notches on the near plate's top edge, one per range
    const notches = side > 0 ? Ln(RANGES.map((_, i) => { const a = rad((i - 1.5) * SELECTOR.leverStep); const x = SH.pivot[0] - Math.sin(a) * SH.pinS; return k.segment([x, y1, 56], [x, y1, 53.5], P); }).join(""), { tone: "lo" }) : "";
    box(SH.pivot[0] - 10, y0, SH.pivot[0] + 12, y1, TUNNEL.z1 + 1.5, 56, { tone: "mid" }, { owner: "shift", name: `shift.plate${side > 0 ? "L" : "R"}`, extra: notches });
  }
  discAt(G.frameAlong([SH.pivot[0], -8.6, SH.pivot[2]], [0, 1, 0]), 0, 1.1, 1.6, { tone: "mid" }, { owner: "shift", name: "shift.pivotheadR" });
  discAt(G.frameAlong([SH.pivot[0], -6.3, SH.pivot[2]], [0, 1, 0]), 0, 12.6, 1.3, { tone: "mid" }, { owner: "shift", name: "shift.pivot" });
  discAt(G.frameAlong([SH.pivot[0], 7.5, SH.pivot[2]], [0, 1, 0]), 0, 1.1, 1.6, { tone: "mid" }, { owner: "shift", name: "shift.pivotheadL" });
  // the lever (live), the cable end fitting on the tunnel, the inner rod (live)
  const lever0 = X.shifter(-1.5 * SELECTOR.leverStep);
  const a0 = rad(-1.5 * SELECTOR.leverStep);
  put([SH.pivot[0], 0, SH.pivot[2] + 8], lever0.svg, { owner: "shift", name: "shift.lever", part: "lever", bias: 1, shapes: [record(A.disc(G.frameAlong(SH.pivot, [-Math.sin(a0), 0, Math.cos(a0)]), -SELECTOR.leverArm, SH.stick - 1, 1, { name: "shift.lever", owner: "shift" })), record(A.ball(lever0.knob, 2.7, { name: "shift.knob", owner: "shift" }))] });
  const GF = G.frameAlong([SH.gland[0] + 6, 0, SH.gland[2]], [-1, 0, 0]);
  turned(GF, [[0, 2], [3.5, 2], [3.5, 1.2], [5, 1.2]], { tone: "mid" }, { owner: "shift", name: "shift.glandA" });
  box(SH.gland[0] + 1, -2.4, SH.gland[0] + 5, 2.4, TUNNEL.z1, SH.gland[2] - 1.8, { tone: "mid" }, { owner: "shift", name: "shift.bracketA" });
  put([SH.gland[0] - 6, 0, SH.gland[2]], X.innerRod(SH.gland, lever0.eye), { owner: "shift", name: "shift.rodA", part: "rodA", bias: 0.8, shapes: [record(A.disc(G.frameAlong(SH.gland, [-1, 0, 0]), 0, 18, 0.42, { name: "shift.rodA", owner: "shift" }))] });
  // the cable conduit from the console fitting, along the tunnel, through the firewall, to the transmission bracket
  const route = [[SH.gland[0] + 6.01, 0, SH.gland[2]], [-134, 0, SH.gland[2]], [-122, 22, 44], [-108, 26, 50], [FIRE.x - 10, 26, 56], [FIRE.x + 8, 26, 56], [-62, 30, 66], [-46, 41, 86], [TRANS_BRACKET.x - 9, 41, 90], [TRANS_BRACKET.x - 2.51, 41, 90]];
  tubeAt(route, CABLE_R, { owner: "shift", name: "shift.cable", tone: "hi", bend: 14, maxLength: 16, touch: ["body.firewall*"], caps: [false, false], ends: [true, true], rims: [2, 2], breaksAt: [{ centre: [FIRE.x - FIRE.t / 2, 26, 56], axis: [1, 0, 0], radius: 6, half: FIRE.t / 2 + 0.3 }] });
  // the fitting at the transmission end, on a bracket off the case top
  const TF = G.frameAlong([TRANS_BRACKET.x, 41, 90], [1, 0, 0]);
  turned(TF, [[0, 2], [2, 2], [2, 1.2], [3, 1.2]], { tone: "mid" }, { owner: "shift", name: "shift.glandB" });
  box(TRANS_BRACKET.x - 1.5, CASE.y + 4, TRANS_BRACKET.x + 1.5, 44, CASE.z1, 86, { tone: "mid" }, { owner: "shift", name: "shift.bracketB" });
  box(TRANS_BRACKET.x - 2.5, 38.6, TRANS_BRACKET.x, 43.4, 86, 94, { tone: "mid" }, { owner: "shift", name: "shift.bracketBtop" });
  const man0 = X.manualLever(-1.5 * SELECTOR.shaftStep);
  put(TRANS_BRACKET.gland.map((c, i) => c + [5, 0, 0][i]), X.innerRod(TRANS_BRACKET.gland, man0.eye), { owner: "shift", name: "shift.rodB", part: "rodB", bias: 0.8, shapes: [record(A.disc(G.frameAlong(TRANS_BRACKET.gland, [1, 0, 0]), 0, 11, 0.42, { name: "shift.rodB", owner: "shift" }))] });
  put(MANUAL.shaftEnd.map((c, i) => c + [0, 0, 2][i]), man0.svg, { owner: "shift", name: "shift.manuallever", part: "manual", bias: 1, shapes: [record(A.disc(G.frameAlong(MANUAL.shaftEnd, [0, 0, 1]), 0, SELECTOR.shaftArm, 1.1, { name: "shift.manuallever", owner: "shift" }))] });
}

// ---------------- wheels and brakes (front corners are live) ----------------
for (const [key, centre] of Object.entries(LAYOUT.wheels)) {
  const side = centre[1] > 0 ? 1 : -1;
  const front = centre[0] === XF;
  const c = X.corner(side, centre, { front });
  const F = c.F;
  const live = key;
  const tyreShape = record(A.solid(F, X.TIRE, { name: `wheel.${key}.tire`, owner: `wheel.${key}` }));
  const K = X.K;
  const knuckleShapes = [record(A.prism(F, K.knuckle, K.ks[0], K.ks[1], { name: `wheel.${key}.knuckle`, owner: `wheel.${key}` }))];
  if (front) knuckleShapes.push(record(A.prism(F, K.arm(c.rear), K.ks[0], K.ks[0] + 2.4, { name: `wheel.${key}.arm`, owner: `wheel.${key}` })));
  put(G.pointOf(F, (K.ks[0] + K.ks[1]) / 2, 0, 0), c.svg.knuckle, { owner: `wheel.${key}`, name: `wheel.${key}.knuckle`, part: `${live}-knuckle`, bias: -2, shapes: knuckleShapes });
  put(G.pointOf(F, (K.disc[0] + K.disc[1]) / 2, 0, 0), c.svg.disc, { owner: `wheel.${key}`, name: `wheel.${key}.disc`, part: `${live}-disc`, shapes: [record(A.disc(F, K.disc[0], K.disc[1], front ? 15 : 13.4, { name: `wheel.${key}.disc`, owner: `wheel.${key}` })), record(A.disc(F, K.hat[0], K.hat[1], 7, { name: `wheel.${key}.hat`, owner: `wheel.${key}` }))] });
  put(G.pointOf(F, (K.disc[0] + K.disc[1]) / 2, 0, 0).map((v, i) => v + F.u[i] * (front ? -c.rear : c.rear) * 18), c.svg.caliper, { owner: `wheel.${key}`, name: `wheel.${key}.caliper`, part: `${live}-caliper`, bias: 0.5, shapes: [record(A.prism(F, K.caliper(c.rear, front), K.disc[0] - 3.2, K.disc[1] + 0.1, { name: `wheel.${key}.caliper`, owner: `wheel.${key}` }))] });
  put(centre, c.svg.tire, { owner: `wheel.${key}`, name: `wheel.${key}.tire`, part: `${live}-tire`, bias: 1, shapes: [tyreShape] });
  put(G.pointOf(F, X.FACE_S + 0.5, 0, 0), c.svg.face, { owner: `wheel.${key}`, name: `wheel.${key}.face`, part: `${live}-face`, bias: 2, shapes: [record(A.disc(F, X.FACE_S - 0.05, X.FACE_S + 1, 17.4, { name: `wheel.${key}.face`, owner: `wheel.${key}` }))] });
  if (front) {
    const rackEnd = LAYOUT.rackEnd(side, 0);
    put(G.lerp3(rackEnd, X.armEnd(side, centre, 0), 0.5), X.tieRod(side, rackEnd, centre, 0), { owner: "steer", name: `steer.tierod${key}`, part: `${key}-tierod`, shapes: [record(A.tube([rackEnd, X.armEnd(side, centre, 0)], 1.1, { name: `steer.tierod${key}`, owner: "steer" }))] });
  }
}

// ---------------- settle the painter's order, assemble ----------------
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const layer = R.items.map((item) => (item.part ? `<g data-part="${item.part}">${item.svg}</g>` : item.svg)).join("");

const label = "A 2014 Buick Verano as a rolling chassis on a display stand, seen from the front left with the body shell left off. The transverse 2.4 litre engine sits on the right with the 6T45 automatic transaxle on its left; halfshafts run to the front wheels on MacPherson struts and a steering rack. A console lever on the floor tunnel pulls a cable that runs through the firewall to the manual lever on top of the transaxle. The rear wheels hang on a twist beam with coil springs, shocks and a Watts link; the exhaust runs down the right side to a rear muffler and the fuel tank sits ahead of the rear axle.";
const svg = k.figureSvg({ width: W, height: H, label, body: [...back, layer] });

const strip = (file) => readFileSync(join(KIT, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const ns = (name, mod, file) => `const ${name} = (() => {\n${strip(file)}\nreturn { ${Object.keys(mod).join(", ")} };\n})();`;
const local = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const CONFIG = { P, LAYOUT: { ...LAYOUT, rackEnd: undefined }, RACK: { x: RACK.x, z: RACK.z, y: RACK.y }, GLAND_A: SHIFTER.gland, GLAND_B: TRANS_BRACKET.gland };
const live = [
  `const k = { ${Object.keys(k).join(", ")} };`,
  ns("G", G, "lathe.mjs"),
  ns("T", T, "tube.mjs"),
  local("spec.mjs"),
  local("parts.mjs"),
  `const C = ${JSON.stringify(CONFIG)};`,
  readFileSync(join(HERE, "live.js"), "utf8"),
].join("\n");

const info = SPEC.rangeInfo("P");
const body = k.plateHtml({
  fig: "Fig 1",
  title: "2014 Buick Verano",
  hint: "P R N D · ← → steer",
  readout: `P · ${info.text}`,
  keys: [
    { mark: "lit", label: "The selector chain: console lever, cable, manual lever on the transaxle" },
    { mark: "raised", label: "Body shell left off; sills, tunnel, firewall, rails and towers kept" },
  ],
  caption: `The car as a rolling chassis, to scale: wheelbase ${CAR.wheelbase} cm, track ${CAR.trackFront} cm, ${CAR.tire} tyres. The shift lever is not connected to the gears. It pulls one cable to the manual lever on the transaxle, which turns the manual shaft inside: that shaft sets a detent lever, moves the manual valve that routes oil to the clutches, and in P pushes the park pawl into the output gear. Reverse is ${SPEC.GEARBOX.ratios.R} : 1 and first ${SPEC.GEARBOX.ratios[1]} : 1 through a ${SPEC.GEARBOX.finalDrive} : 1 final drive, so at ${CAR.idleRpm} rpm idle the wheels creep at ${SPEC.rangeInfo("D").wheelRpm.toFixed(0)} rpm in D. The steering wheel turns a column with an electric assist motor, an intermediate shaft with two universal joints and a rack behind the axle; about ${SPEC.STEERING.ratio} turns of the wheel per turn of the road wheels.`,
  body: `<div class="iso-stage" tabindex="0" role="application" aria-label="Verano rolling chassis: keys P, R, N, D move the selector; left and right arrows steer">${svg}</div>`,
});
const controls = `<div class="vr-controls"><span class="vr-group" role="radiogroup" aria-label="Range">${RANGES.map((r) => `<button type="button" data-range="${r}" aria-pressed="${r === "P"}">${r}</button>`).join("")}</span><span class="vr-group" aria-label="Steering"><button type="button" data-steer="-1" aria-label="Steer left">←</button><button type="button" data-steer="0" aria-label="Centre">centre</button><button type="button" data-steer="1" aria-label="Steer right">→</button></span></div>`;
const CSS = `
.iso-solid>*{transition:fill .4s ease,stroke .4s ease}
.iso-stage{outline:none}
.iso-stage:focus-visible{box-shadow:0 0 0 1px var(--anatomy-faint);border-radius:6px}
.vr-controls{display:flex;gap:18px;justify-content:center;flex-wrap:wrap;margin:14px 0 0}
.vr-group{display:inline-flex;gap:6px}
.vr-controls button{font:11px/1 var(--anatomy-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--anatomy-muted);background:transparent;border:1px solid var(--anatomy-faint);border-radius:999px;padding:7px 11px;min-width:34px;cursor:pointer}
.vr-controls button[aria-pressed="true"]{color:var(--anatomy-text);border-color:var(--anatomy-hi)}
@media (max-width:520px){.iso-plate-corner[data-corner="hint"]{display:none}.iso-plate-corner[data-corner="readout"]{font-size:8.6px;letter-spacing:0}}
`;
const page = body.replace("<figcaption", `${controls}<figcaption`);
writeFileSync(join(HERE, "verano.html"), k.pageHtml({ title: "2014 Buick Verano", theme: "light", body: `<style>${CSS}</style>${page}`, script: kitScript() + "\n" + live, width: 760 }));
console.log("wrote verano.html", (readFileSync(join(HERE, "verano.html")).length / 1024).toFixed(0) + " KB", R.items.length, "items", R.solids.length, "shapes", R.tubes.length, "tubes");
const ALLOW = [
  ["susp.seat*", "susp.strut*"], ["susp.coil*", "susp.strut*"], ["body.tower*", "susp.coil*"], ["body.tower*", "susp.strut*"], ["susp.lca*", "susp.lcabush*"],
  ["steer.rim", "steer.*"], ["steer.hub", "steer.spokes"], ["steer.column*", "steer.*"], ["body.firewall*", "steer.columnstub"], ["body.firewall*", "shift.cable*"],
  ["engine.intake", "engine.runner*"], ["engine.pulley", "engine.belt"], ["engine.alternator", "engine.altpulley"], ["cool.shroud", "cool.fan"], ["drive.bearing", "drive.intershaft"],
  ["rear.arm*", "rear.bush*"], ["rear.pivotbracket*", "rear.bush*"], ["rear.wattscrank", "rear.watts*"], ["shift.pivot*", "shift.*"], ["susp.bush*", "susp.swaybar*"], ["body.radpost*", "body.rad*"],
];
A.auditOrExit(R, P, { allow: ALLOW });
