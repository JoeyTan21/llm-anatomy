// Parts that move or change, built the same way at build time and in the page.
// `k` is the kit namespace, `P` the projection.

export function makeParts(k, P) {
  const TAU = Math.PI * 2;
  const DECK = 16; // every crate stands at this height: rack lanes, cart deck, apron, table top
  const HALF = 7; // crates are 14 x 14
  const BODY = 11;

  const turn = (ring, angle, cx, cy) => {
    const c = Math.cos(angle), s = Math.sin(angle);
    return ring.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
  };
  const square = (half, r, steps = 3) => k.ringOf({ x: -half, y: -half, w: half * 2, d: half * 2, r }, steps);

  // A crate of 24 KiB. Raw crates carry four blocks of data proud of the rim; as the
  // worker gets through it they sink in, and a done crate gets its lid.
  function crate(cx, cy, angle, { state = "raw", progress = 0, lid = 0, tone = "hi", z = DECK } = {}) {
    const out = [];
    const ring = turn(square(HALF, 1.2), angle, cx, cy);
    const top = z + BODY;
    const seams = k.lineSvg(k.ringSeam(ring, z + 3.6, P) + k.ringSeam(ring, z + 7.4, P), { tone: "faint" });
    out.push(k.solidSvg(k.extrude(ring, z, BODY, P, { bevel: 0.45 }), { tone, crease: tone === "hi" ? "lo" : "faint", inner: seams }));
    out.push(k.lineSvg(k.onTop(turn(square(HALF - 1.3, 0.6), angle, cx, cy), top, P, true), { tone: "faint" }));
    const rise = 1.5 * (1 - progress);
    if (rise > 0.04 && lid < 0.999) {
      const blocks = [[-2.9, -2.9], [2.9, -2.9], [-2.9, 2.9], [2.9, 2.9]]
        .map(([x, y]) => turn([[x, y]], angle, cx, cy)[0])
        .sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
      for (const [bx, by] of blocks) out.push(k.solidSvg(k.extrude(turn(square(2.2, 0.5, 2), angle, bx, by), top, rise, P), { tone: "mid", crease: "none" }));
    }
    if (lid > 0.001) {
      const cap = turn(square(HALF + 0.25, 1.4), angle, cx, cy);
      const strap = turn([[-HALF - 0.25, 0], [HALF + 0.25, 0]], angle, cx, cy);
      const dots = turn([[-3.6, 0], [3.6, 0]], angle, cx, cy).map(([x, y]) => k.iso([x, y, top + 1.1], P));
      out.push(`<g opacity="${lid.toFixed(3)}">${k.solidSvg(k.extrude(cap, top, 1.1, P, { bevel: 0.35 }), { tone, crease: "faint" })}${k.lineSvg(k.onTop(strap, top + 1.1, P), { tone: "lo" })}${k.dotsSvg(dots, { size: 0.45, tone: "mid" })}</g>`);
    }
    return out.join("");
  }

  // The index table's top: four pocket outlines and rim ticks, turned by `angle`.
  function tableMarks(cx, cy, R, rim, z, angle) {
    const pockets = [0, 1, 2, 3].map((i) => {
      const a = angle + (i * TAU) / 4;
      return k.onTop(turn(square(HALF + 0.9, 1.4), angle, cx + R * Math.cos(a), cy + R * Math.sin(a)), z, P, true);
    }).join("");
    const minor = [], major = [];
    for (let i = 0; i < 48; i++) {
      const a = angle + (i * TAU) / 48;
      const big = i % 12 === 0;
      const r0 = rim - (big ? 3.2 : 1.6);
      (big ? major : minor).push(k.lineOnTop([cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)], [cx + rim * Math.cos(a), cy + rim * Math.sin(a)], z, P));
    }
    return k.lineSvg(pockets, { tone: "lo" }) + k.lineSvg(minor.join(""), { tone: "lo" }) + k.lineSvg(major.join(""), { tone: "mid" });
  }

  // Vertical marks on the visible side of a turning cylinder (the cutter, the motor fan).
  function spinMarks(cx, cy, r, z0, z1, count, phase) {
    const [vx, vy] = k.towardViewer(P);
    const out = [];
    for (let i = 0; i < count; i++) {
      const a = phase + (i * TAU) / count;
      const nx = Math.cos(a), ny = Math.sin(a);
      if (nx * vx + ny * vy < 0.2) continue;
      out.push(k.segment([cx + r * nx, cy + r * ny, z0], [cx + r * nx, cy + r * ny, z1], P));
    }
    return out.join("");
  }

  // Spokes on a face-up wheel, from the hub ring to the rim ring.
  function spokes(cx, cy, r0, r1, z, count, phase) {
    return Array.from({ length: count }, (_, i) => {
      const a = phase + (i * TAU) / count;
      return k.lineOnTop([cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)], [cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)], z, P);
    }).join("");
  }

  // A gauge needle for a fraction 0..1 over a 270 degree sweep (kit dial convention:
  // angle 0 points to -y, clockwise from above).
  const SWEEP = { from: -0.75 * Math.PI, span: 1.5 * Math.PI };
  function needle(cx, cy, r, z, fraction) {
    const a = SWEEP.from + Math.min(1, Math.max(0, fraction)) * SWEEP.span;
    const sx = Math.sin(a), sy = -Math.cos(a);
    return k.lineOnTop([cx - sx * 2.2, cy - sy * 2.2], [cx + sx * r, cy + sy * r], z, P);
  }

  // The flyball governor: two balls on arms orbiting a spindle at a fixed speed.
  function governor(cx, cy, zTop, zBall, reach, phase) {
    return [0, Math.PI].map((offset) => {
      const a = phase + offset;
      const ball = [cx + reach * Math.cos(a), cy + reach * Math.sin(a), zBall];
      return { ball, depth: k.depthOf(ball, P), arm: k.segment([cx + 1.2 * Math.cos(a), cy + 1.2 * Math.sin(a), zTop], ball, P), at: k.iso(ball, P) };
    });
  }

  return { DECK, HALF, BODY, SWEEP, turn, square, crate, tableMarks, spinMarks, spokes, needle, governor };
}
