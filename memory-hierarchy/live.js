// Live code. Runs after the kit, model.mjs and parts.mjs are inlined; C holds the build's layout.
const P = C.P;
const X = makeParts(k, P);
const LEG = 1.2; // seconds of animation per cart leg (2.18 microseconds on the GPU)
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const $ = (sel) => svg.querySelector(sel);
const cartG = $('[data-part="cart"]');
const layers = { rack: $('[data-layer="rack-crates"]'), main: $('[data-layer="crates"]') };
const marks = $('[data-part="table-marks"]');
const cutter = $('[data-part="cutter"]'), fly = $('[data-part="flywheel"]');
const govBack = $('[data-part="gov-back"]'), govFront = $('[data-part="gov-front"]');
const needles = { cart: $('[data-part="needle-cart"]'), worker: $('[data-part="needle-worker"]') };
const pointer = $('[data-part="pointer"]');
const litParts = { softmax: [$('[data-part="cart-deck"] .iso-solid')], matmul: [$('[data-part="head"] .iso-solid'), $('[data-part="quill"] .iso-solid')] };
const readout = document.querySelector("[data-readout]");
const buttons = [...document.querySelectorAll(".mh-jobs button")];
const still = matchMedia("(prefers-reduced-motion: reduce)");

let sim = createSim("softmax");
const views = new Map();
const ease = (t) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, t)))) / 2;
const lerp = (a, b, t) => a + (b - a) * t;
const cartX = () => lerp(C.CART_X[0], C.CART_X[1], ease(sim.cart.pos));
const queueX = (k) => C.RACK_FACE - 9 - 20 * Math.min(k, 3.5);
function coord(loc) {
  if (loc.kind === "cart") return [cartX(), C.LANE_Y[loc.lane]];
  if (loc.kind === "slot") { const a = C.STATION[loc.s]; return [C.TABLE.c[0] + C.TABLE.R * Math.cos(a), C.TABLE.c[1] + C.TABLE.R * Math.sin(a)]; }
  if (loc.kind === "whIn") return [queueX(loc.k), C.LANE_Y[0]];
  return [queueX(loc.k), C.LANE_Y[1]];
}
function placeOf(c) {
  const e = ease(c.p);
  if (c.a.kind === "slot" && c.b.kind === "slot" && c.a.s !== c.b.s) {
    const a = C.STATION[c.a.s] + e * Math.PI / 2;
    return [C.TABLE.c[0] + C.TABLE.R * Math.cos(a), C.TABLE.c[1] + C.TABLE.R * Math.sin(a), e * Math.PI / 2];
  }
  const [ax, ay] = coord(c.a), [bx, by] = coord(c.b);
  return [lerp(ax, bx, e), lerp(ay, by, e), 0];
}

function drawCrates() {
  const seen = new Set();
  const order = { rack: [], main: [] };
  for (const c of Object.values(sim.crates)) {
    seen.add(c.id);
    let v = views.get(c.id);
    if (!v) { v = { el: document.createElementNS("http://www.w3.org/2000/svg", "g"), key: "" }; v.el.setAttribute("data-crate", c.id); views.set(c.id, v); }
    const [x, y, rot] = placeOf(c);
    const key = `${c.state}|${c.progress.toFixed(2)}|${c.lid.toFixed(2)}|${rot.toFixed(3)}`;
    if (key !== v.key) { v.el.innerHTML = X.crate(0, 0, rot, { state: c.state, progress: c.progress, lid: c.lid }); v.key = key; }
    v.el.setAttribute("transform", translateAlong(P, [x, y, 0]));
    const alpha = c.alpha.toFixed(3);
    if (v.el.getAttribute("opacity") !== alpha) v.el.setAttribute("opacity", alpha);
    order[x < C.RACK_FACE - 3 ? "rack" : "main"].push([depthOf([x, y, 0], P), v.el]);
  }
  for (const [id, v] of views) if (!seen.has(id)) { v.el.remove(); views.delete(id); }
  for (const name of ["rack", "main"]) {
    const list = order[name].sort((a, b) => a[0] - b[0]).map(([, el]) => el);
    const layer = layers[name];
    const now = [...layer.children];
    if (now.length !== list.length || list.some((el, i) => now[i] !== el)) list.forEach((el) => layer.appendChild(el));
  }
}

// motion that is not the simulation: the fixed-speed drive and the eased gauges
const MOTOR = Math.PI * 2 * 1.1; // rad per second of animation
const CUTTER = Math.PI * 2 * 1.6;
const spin = { motor: 0, cutter: 0 };
const shown = { cart: 0, worker: 0, knob: -1.35 };
let lastAngle = null;
function drawMachine(dt) {
  cartG.setAttribute("transform", translateAlong(P, [cartX() - C.CART_X[0], 0, 0]));
  const turning = sim.table.indexing ? ease(1 - Math.max(0, sim.table.timer) / TIMING.index) * Math.PI / 2 : 0;
  if (turning !== lastAngle) { marks.innerHTML = X.tableMarks(C.TABLE.c[0], C.TABLE.c[1], C.TABLE.R, C.TABLE.r - 0.8, X.DECK, turning); lastAngle = turning; }
  spin.motor += MOTOR * dt;
  if (sim.working) spin.cutter += CUTTER * dt;
  const [hx, hy] = C.HEAD, [cx, cy] = C.COLUMN;
  cutter.innerHTML = lineSvg(X.spinMarks(hx, hy, 5, 33.4, 36.1, 16, spin.cutter), { tone: "lo" });
  fly.innerHTML = lineSvg(X.spokes(hx, hy, 2.8, 9.4, C.FLY_Z + 4, 5, -spin.motor * 4 / 11), { tone: "lo" });
  const balls = X.governor(cx, cy, C.GOV.top - 1, C.GOV.ball, C.GOV.reach, spin.motor);
  const centre = depthOf([cx, cy, C.GOV.ball], P);
  const br = C.GOV.r * P.scale;
  const ballSvg = (b) => `${lineSvg(b.arm, { tone: "mid" })}<circle class="mh-gov" cx="${b.at[0].toFixed(2)}" cy="${b.at[1].toFixed(2)}" r="${br.toFixed(2)}"/><circle class="mh-shine" cx="${(b.at[0] - br * 0.32).toFixed(2)}" cy="${(b.at[1] - br * 0.32).toFixed(2)}" r="${(br * 0.42).toFixed(2)}"/>`;
  govBack.innerHTML = balls.filter((b) => b.depth < centre).map(ballSvg).join("");
  govFront.innerHTML = balls.filter((b) => b.depth >= centre).map(ballSvg).join("");
  const l = ledger(sim);
  const follow = (from, to, s) => (still.matches ? to : from + (to - from) * (1 - Math.exp(-dt / s)));
  if (sim.since > 0.5) { shown.cart = follow(shown.cart, l.cart, 0.35); shown.worker = follow(shown.worker, l.worker, 0.35); }
  shown.knob = follow(shown.knob, sim.job === "softmax" ? -1.35 : 1.35, 0.18);
  const g = C.GAUGE_CART, w = C.GAUGE_WORK;
  needles.cart.setAttribute("d", X.needle(g.c[0], g.c[1], g.r - 2.4, g.z + g.h + 0.2, shown.cart));
  needles.worker.setAttribute("d", X.needle(w.c[0], w.c[1], w.r - 2.4, w.z + w.h + 0.2, shown.worker));
  const [kx, ky] = C.KNOB, a = shown.knob;
  pointer.setAttribute("d", lineOnTop([kx - 1.2 * Math.sin(a), ky + 1 + 1.2 * Math.cos(a)], [kx + 4.2 * Math.sin(a), ky + 1 - 4.2 * Math.cos(a)], 12, P));
}

const fmtBytes = (b) => (b < 1e6 ? `${(b / 1e3).toFixed(0)} kB` : `${(b / 1e6).toFixed(2)} MB`);
const fmtFlops = (f) => (f < 1e6 ? `${(f / 1e3).toFixed(0)} kFLOP` : f < 1e9 ? `${(f / 1e6).toFixed(1)} MFLOP` : `${(f / 1e9).toFixed(2)} GFLOP`);
let lastText = "";
function drawReadout() {
  const l = ledger(sim);
  const idle = l.waiting === "worker" ? 1 - l.worker : 1 - l.cart;
  const text = sim.since < 0.5 ? `${sim.job} · starting` : `${sim.job} · ${fmtBytes(l.bytes)} moved · ${fmtFlops(l.flops)} · ${l.waiting} waiting ${Math.round(idle * 100)}%`;
  if (text !== lastText) {
    readout.textContent = text; lastText = text;
    stage.setAttribute("aria-valuetext", text);
    stage.dataset.cart = l.cart.toFixed(3); stage.dataset.worker = l.worker.toFixed(3);
  }
}
function draw(dt) { drawMachine(dt); drawCrates(); drawReadout(); }

function choose(job) {
  setJob(sim, job);
  stage.dataset.job = job;
  for (const b of buttons) b.setAttribute("aria-pressed", String(b.dataset.job === job));
  for (const [name, parts] of Object.entries(litParts)) for (const el of parts) el.toggleAttribute("data-lit", name === job);
  if (still.matches) { for (let i = 0; i < 6000; i++) stepSim(sim, 0.01); draw(1); }
}

let frame = 0, last = 0, visible = false, touring = true, tourClock = 0;
const TOUR = [["softmax", 20], ["matmul", 32]];
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  if (touring) {
    tourClock += dt;
    const cycle = TOUR[0][1] + TOUR[1][1];
    const want = tourClock % cycle < TOUR[0][1] ? TOUR[0][0] : TOUR[1][0];
    if (want !== sim.job) choose(want);
  }
  let legs = dt / LEG;
  while (legs > 1e-9) { const h = Math.min(0.01, legs); stepSim(sim, h); legs -= h; }
  draw(dt);
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
const pick = (job) => { touring = false; choose(job); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("click", () => pick(sim.job === "softmax" ? "matmul" : "softmax"));
stage.addEventListener("keydown", (event) => {
  let job = null;
  if (event.key === "1") job = "softmax";
  if (event.key === "2") job = "matmul";
  if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === " " || event.key === "Enter") job = sim.job === "softmax" ? "matmul" : "softmax";
  if (!job) return;
  event.preventDefault();
  pick(job);
});
for (const b of buttons) b.addEventListener("click", () => pick(b.dataset.job));
still.addEventListener("change", () => { if (still.matches) choose(sim.job); else run(); });
choose("softmax");
if (still.matches) { touring = false; choose("softmax"); }
draw(1 / 60);
