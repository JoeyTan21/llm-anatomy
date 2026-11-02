// Parts that move. Built the same way at build time (Node) and in the page: `k` is the kit,
// `G` the lathe module, `P` the projection, `L` the layout constants from build.mjs.

export function makeParts(k, G, P, L) {
  const TAU = Math.PI * 2;
  const V = G.viewOf(P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const rad = (deg) => (deg * Math.PI) / 180;
  const at = (p) => k.iso(p, P);

  // ---- wheels ----
  const TW = L.tire.width, TR = L.tire.radius;
  // the brake and hub carrier sit inboard of the tyre's inner face (s = -TW/2), in frame units
  const K = {
    disc: [-TW / 2 - 2.7, -TW / 2 - 0.1],
    hat: [-TW / 2 - 3.3, -TW / 2 - 2.7],
    ks: [-TW / 2 - 7.3, -TW / 2 - 3.3],
    knuckle: [[-4.5, -4], [4.5, -4], [4.5, 15.6], [-4.5, 15.6]],
    arm: (rear) => [[rear * 4, -4], [rear * 14, -2.5], [rear * 14, 0], [rear * 4, 0]],
    caliper: (rear, front) => { const cu = (front ? -rear : rear) * (front ? 15.3 : 13.7), d = front ? -rear : rear; return [[cu, -5], [cu + d * 7, -5], [cu + d * 7, 5], [cu, 5]]; },
  };
  const TIRE = [[-TW / 2, 19], [-TW / 2, 28.5], [-TW / 2 + 1.4, TR - 1.3, 1], [-TW / 2 + 4.2, TR, 1], [TW / 2 - 4.2, TR, 1], [TW / 2 - 1.4, TR - 1.3, 1], [TW / 2, 28.5], [TW / 2, 22], [TW / 2 - 2.6, 22], [TW / 2 - 2.6, 18], [TW / 2 - 1.2, 18]];
  const FACE_S = TW / 2 - 1.2;
  const wheelAxis = (side, steerDeg) => [-Math.sin(rad(steerDeg)) * side, Math.cos(rad(steerDeg)) * side, 0];
  const wheelFrame = (side, centre, steerDeg) => G.frameAlong(centre, wheelAxis(side, steerDeg));

  const tread = (F, roll) => k.fadedSvg(G.ribsOf(F, -TW / 2 + 4.2, TW / 2 - 4.2, TR, 36, P, { fade: [0.1, 0.55], seams: true, phase: rad(roll) }), { tone: "lo" });
  const rimFace = (F, roll, faces) => (faces ? Ln(G.spokesOf(F, FACE_S, 5.2, 17.2, 5, P, { phase: rad(roll) }), { tone: "lo" }) + Ln(G.circleOf(F, FACE_S, 17.4, P), { tone: "faint" }) : "");
  const capDots = (F, roll, faces) => (faces ? k.dotsSvg(G.dotsOf(F, FACE_S + 1, 2.9, 5, P, { all: true, phase: rad(roll) }), { size: 0.4, tone: "mid" }) : "");
  // The turning marks alone, for a roll step on a wheel whose steering has not changed.
  function rolling(side, centre, { steer = 0, roll = 0 } = {}) {
    const F = wheelFrame(side, centre, steer);
    const faces = G.dot3(F.a, V) > 0.08;
    return { tread: tread(F, roll), rimface: rimFace(F, roll, faces), cap: capDots(F, roll, faces) };
  }
  // One corner: tyre and rim, brake disc with its hat, the caliper ahead of the disc, the hub
  // carrier (knuckle). `rear` is the world -x direction in the frame's u coordinate.
  function corner(side, centre, { steer = 0, roll = 0, front = true } = {}) {
    const F = wheelFrame(side, centre, steer);
    const rear = G.dot3(F.u, [-1, 0, 0]) > 0 ? 1 : -1;
    const faces = G.dot3(F.a, V) > 0.08;
    const out = {};
    const lip = Ln(G.arcOf(F, TW / 2 - 2.6, 22, P), { tone: "faint" });
    // the tread and the rim face turn with the wheel; they live in their own groups so a roll
    // step only rewrites those, not the tyre body
    out.tire = S(G.solidOf(TIRE, F, P, { smooth: { rows: 3 } }), { tone: "mid", crease: "lo", inner: `<g data-tread>${tread(F, roll)}</g>` + lip });
    out.face = `<g data-rimface>${rimFace(F, roll, faces)}</g>` + S(G.disc(FACE_S, FACE_S + 1, 4.6, F, P), { tone: "mid" }) + `<g data-cap>${capDots(F, roll, faces)}</g>`;
    const discS = K.disc;
    out.disc = S(G.disc(discS[0], discS[1], front ? 15 : 13.4, F, P), { tone: "mid", inner: !faces ? Ln(G.circleOf(F, discS[0], 9.2, P), { tone: "faint" }) : "" }) + S(G.disc(K.hat[0], K.hat[1], 7, F, P), { tone: "mid" });
    const cal = K.caliper(rear, front);
    out.caliper = S(G.prismOf(F, cal, discS[0] - 2.2, discS[1] + 0.1, P), { tone: "hi" }) + S(G.prismOf(F, cal.map(([u, v]) => [u * 0.9 + cal[1][0] * 0.1, v * 0.6]), discS[0] - 3.2, discS[0] - 2.2, P), { tone: "mid" });
    out.knuckle = S(G.prismOf(F, K.knuckle, K.ks[0], K.ks[1], P), { tone: "mid" });
    if (front) out.knuckle += S(G.prismOf(F, K.arm(rear), K.ks[0], K.ks[0] + 2.4, P), { tone: "mid" });
    return { F, rear, svg: out };
  }
  // where the outer tie rod lands on the steering arm
  function armEnd(side, centre, steer) {
    const F = wheelFrame(side, centre, steer);
    const rear = G.dot3(F.u, [-1, 0, 0]) > 0 ? 1 : -1;
    return G.pointOf(F, K.ks[0] + 1.2, 0, 0).map((c, i) => c + F.u[i] * rear * 13 - F.v[i] * 1.2);
  }

  // ---- a vertical coil spring split for the painter: back half, rod, front half ----
  function coilZ(cx, cy, r, z0, z1, turns, perTurn = 18) {
    const count = Math.max(2, Math.round(turns * perTurn));
    const back = [], front = [];
    let run = [], near = null;
    for (let i = 0; i <= count; i++) {
      const t = i / count, a = t * turns * TAU;
      const p = at([cx + r * Math.cos(a), cy + r * Math.sin(a), z0 + (z1 - z0) * t]);
      const facing = k.depthOf([Math.cos(a), Math.sin(a), 0], P) > 0;
      if (near === null) near = facing;
      if (facing !== near) { run.push(p); (near ? front : back).push(k.pathOf(run)); run = [p]; near = facing; continue; }
      run.push(p);
    }
    if (run.length > 1) (near ? front : back).push(k.pathOf(run));
    return { back: back.join(""), front: front.join("") };
  }

  // ---- the range selector chain ----
  // Console lever: pivot on the bracket, tilted by `lever` degrees (positive = knob back).
  function shifter(leverDeg) {
    const a = rad(leverDeg);
    const dir = [-Math.sin(a), 0, Math.cos(a)];
    const F = G.frameAlong(L.shifter.pivot, dir);
    const knob = G.pointOf(F, L.shifter.stick, 0, 0);
    const eye = G.pointOf(F, -L.selector.leverArm, 0, 0);
    const pin = G.pointOf(F, L.shifter.pinS, 0, 0);
    const pinF = G.frameAlong(pin, [0, 1, 0]);
    const svg =
      S(G.disc(-L.selector.leverArm, L.shifter.stick - 2, 0.9, F, P), { tone: "hi", lit: true }) +
      S(G.disc(-L.shifter.pinHalf, L.shifter.pinHalf, 0.55, pinF, P), { tone: "mid" }) +
      S(G.sphereOf(knob, 2.7, P), { tone: "hi", lit: true }) +
      S(G.sphereOf(eye, 1.1, P), { tone: "mid" });
    return { svg, eye, knob };
  }
  // The transmission's manual lever on the manual shaft (axis along y), tilted by `shaft` degrees.
  function manualLever(shaftDeg) {
    const a = rad(shaftDeg);
    const dir = [Math.sin(a), 0, Math.cos(a)];
    const F = G.frameAlong(L.manual.shaftEnd, dir);
    const eye = G.pointOf(F, L.selector.shaftArm, 0, 0);
    const svg = S(G.prismOf(F, [[-1.1, -0.5], [1.1, -0.5], [1.1, 0.5], [-1.1, 0.5]], 0, L.selector.shaftArm, P), { tone: "hi", lit: true }) + S(G.sphereOf(eye, 1, P), { tone: "mid" });
    return { svg, eye };
  }
  // The inner cable: a rod that slides out of the conduit's end fitting to the eye.
  function innerRod(gland, eye) {
    const d = G.sub3(eye, gland);
    const len = G.len3(d);
    const F = G.frameAlong(gland, d);
    return S(G.disc(0, len, 0.42, F, P), { tone: "hi", lit: true, crease: "none" });
  }

  // ---- steering ----
  function steeringWheel(wheelDeg) {
    const F = L.column.frame;
    const phase = rad(wheelDeg) + Math.PI / 2;
    return Ln(G.spokesOf(F, 1.4, 4.6, 14.6, 3, P, { phase }), { tone: "hi" });
  }
  function tieRod(side, rackEnd, centre, steer) {
    const end = armEnd(side, centre, steer);
    const d = G.sub3(end, rackEnd);
    const F = G.frameAlong(rackEnd, d);
    const len = G.len3(d);
    return S(G.disc(0, len - 1.2, 1.1, F, P), { tone: "hi", crease: "none" }) + S(G.sphereOf(end, 1.8, P), { tone: "mid" }) + S(G.sphereOf(rackEnd, 1.6, P), { tone: "mid" });
  }

  // ---- fan ----
  function fanBlades(spinDeg) {
    const F = L.fan.frame;
    return Ln(G.spokesOf(F, 0.6, 3.5, L.fan.r - 0.1, 7, P, { phase: rad(spinDeg), sweep: 0.5 }), { tone: "lo" });
  }

  return { corner, rolling, armEnd, wheelFrame, coilZ, shifter, manualLever, innerRod, steeringWheel, tieRod, fanBlades, TIRE, FACE_S, K };
}
