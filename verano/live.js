// Live code. The kit, lathe (G), tube (T), spec.mjs and parts.mjs are inlined above; C is the build's layout.
const P = C.P;
const L = C.LAYOUT;
L.column.frame = L.column.frame; // frames survive JSON as plain objects
const X = makeParts(k, G, P, L);
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const $ = (name) => svg.querySelector(`[data-part="${name}"]`);
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const rangeButtons = [...document.querySelectorAll("[data-range]")];
const steerButtons = [...document.querySelectorAll("[data-steer]")];

const rangeAngle = (r) => (RANGES.indexOf(r) - 1.5) * SELECTOR.leverStep;
const shaftAngle = (r) => (RANGES.indexOf(r) - 1.5) * SELECTOR.shaftStep;
const state = {
  range: "P", lever: rangeAngle("P"), shaft: shaftAngle("P"),
  wheelDeg: 0, wheelShown: 0, steerShown: 0, roll: 0, speed: 0, fan: 0,
};
const parts = {
  lever: $("lever"), rodA: $("rodA"), rodB: $("rodB"), manual: $("manual"), spokes: $("spokes"), fan: $("fan"),
  FL: { tire: $("FL-tire"), face: $("FL-face"), disc: $("FL-disc"), caliper: $("FL-caliper"), knuckle: $("FL-knuckle"), tierod: $("FL-tierod") },
  FR: { tire: $("FR-tire"), face: $("FR-face"), disc: $("FR-disc"), caliper: $("FR-caliper"), knuckle: $("FR-knuckle"), tierod: $("FR-tierod") },
  RL: { tire: $("RL-tire"), face: $("RL-face") },
  RR: { tire: $("RR-tire"), face: $("RR-face") },
};
const rackEnd = (side, travel) => [C.RACK.x, side * (C.RACK.y - 2) + travel, C.RACK.z];

const follow = (from, to, dt, s) => (still.matches ? to : from + (to - from) * (1 - Math.exp(-dt / s)));
let lastSteer = null, lastRoll = null, lastLever = null, lastShaft = null, lastWheel = null;

function drawSelector() {
  if (state.lever !== lastLever) {
    const lever = X.shifter(state.lever);
    parts.lever.innerHTML = lever.svg;
    parts.rodA.innerHTML = X.innerRod(C.GLAND_A, lever.eye);
    lastLever = state.lever;
  }
  if (state.shaft !== lastShaft) {
    const man = X.manualLever(state.shaft);
    parts.manual.innerHTML = man.svg;
    parts.rodB.innerHTML = X.innerRod(C.GLAND_B, man.eye);
    lastShaft = state.shaft;
  }
}
function drawSteering() {
  if (state.wheelShown !== lastWheel) { parts.spokes.innerHTML = X.steeringWheel(state.wheelShown); lastWheel = state.wheelShown; }
  const steer = state.steerShown, roll = state.roll;
  if (steer === lastSteer && roll === lastRoll) return;
  const steerChanged = Math.abs(steer - (lastSteer ?? 1e9)) > 0.05;
  for (const key of ["FL", "FR", "RL", "RR"]) {
    const front = key[0] === "F", side = key[1] === "L" ? 1 : -1;
    const slots = parts[key];
    const wheelSteer = front ? steer : 0;
    if (front && steerChanged) {
      // the whole corner turns about the kingpin: tyre, rim, disc, caliper and knuckle are rebuilt
      const c = X.corner(side, L.wheels[key], { steer, roll, front: true });
      slots.tire.innerHTML = c.svg.tire;
      slots.face.innerHTML = c.svg.face;
      slots.disc.innerHTML = c.svg.disc;
      slots.caliper.innerHTML = c.svg.caliper;
      slots.knuckle.innerHTML = c.svg.knuckle;
      // rack travel follows the steering arm, so the tie rod stays on both balls
      const arm = X.armEnd(side, L.wheels[key], steer);
      const rest = X.armEnd(side, L.wheels[key], 0);
      slots.tierod.innerHTML = X.tieRod(side, rackEnd(side, arm[1] - rest[1]), L.wheels[key], steer);
    } else if (roll !== lastRoll) {
      // only the marks that turn with the wheel are rewritten
      const r = X.rolling(side, L.wheels[key], { steer: wheelSteer, roll });
      slots.tire.querySelector("[data-tread]").innerHTML = r.tread;
      slots.face.querySelector("[data-rimface]").innerHTML = r.rimface;
      slots.face.querySelector("[data-cap]").innerHTML = r.cap;
    }
  }
  if (steerChanged) lastSteer = steer;
  lastRoll = roll;
}

let lastText = "";
function drawReadout() {
  const info = rangeInfo(state.range);
  const road = roadWheelAngle(state.wheelShown);
  const steerText = Math.abs(road) < 0.5 ? "" : ` · wheel ${Math.round(state.wheelShown)}° → ${road.toFixed(0)}° ${road > 0 ? "L" : "R"}`;
  const text = `${info.range} · ${steerText ? info.short : info.text}${info.wheelRpm ? ` · ${info.wheelRpm.toFixed(0)} wheel rpm` : ""}${steerText}`;
  if (text !== lastText) { readout.textContent = text; lastText = text; stage.setAttribute("aria-valuetext", text); }
}

function choose(range) {
  state.range = range;
  stage.dataset.range = range;
  for (const b of rangeButtons) b.setAttribute("aria-pressed", String(b.dataset.range === range));
}

let frame = 0, last = 0, visible = false, touring = true, clock = 0;
const TOUR = [["P", 0, 3], ["R", 0, 4], ["N", 0, 2.5], ["D", 0, 3], ["D", 300, 3.5], ["D", -300, 4], ["D", 0, 3], ["P", 0, 1]];
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  if (touring) {
    clock += dt;
    let t = clock % TOUR.reduce((a, s) => a + s[2], 0);
    for (const [range, wheel, span] of TOUR) { if (t < span) { if (range !== state.range) choose(range); state.wheelDeg = wheel; break; } t -= span; }
  }
  // the selector chain: lever, cable, manual lever move together, eased as a hand would move them
  state.lever = follow(state.lever, rangeAngle(state.range), dt, 0.22);
  state.shaft = follow(state.shaft, shaftAngle(state.range), dt, 0.22);
  // wheels creep at idle in D and R; roll shown at true wheel rpm
  const info = rangeInfo(state.range);
  state.speed = follow(state.speed, info.dir * info.wheelRpm * 6, dt, 0.6); // degrees per second
  state.roll = (state.roll + state.speed * dt) % 360;
  state.wheelShown = follow(state.wheelShown, state.wheelDeg, dt, 0.5);
  state.steerShown = roadWheelAngle(state.wheelShown);
  state.fan = (state.fan + 140 * dt) % 360;
  parts.fan.querySelector(".iso-line[data-tone='lo']").outerHTML = X.fanBlades(state.fan);
  drawSelector();
  drawSteering();
  drawReadout();
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
const pick = (range) => { touring = false; choose(range); run(); };
const steer = (dir) => { touring = false; state.wheelDeg = dir === 0 ? 0 : Math.max(-540, Math.min(540, state.wheelDeg + dir * 90)); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("keydown", (event) => {
  const key = event.key.toUpperCase();
  if (RANGES.includes(key)) { event.preventDefault(); pick(key); return; }
  if (event.key === "ArrowLeft") { event.preventDefault(); steer(1); }
  if (event.key === "ArrowRight") { event.preventDefault(); steer(-1); }
  if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); const i = RANGES.indexOf(state.range) + (event.key === "ArrowDown" ? 1 : -1); if (RANGES[i]) pick(RANGES[i]); }
  if (event.key === "0") { event.preventDefault(); steer(0); }
});
stage.addEventListener("click", () => { pick(RANGES[(RANGES.indexOf(state.range) + 1) % RANGES.length]); });
for (const b of rangeButtons) b.addEventListener("click", () => pick(b.dataset.range));
for (const b of steerButtons) b.addEventListener("click", () => steer(Number(b.dataset.steer) * -1 || 0));
still.addEventListener("change", () => { if (!still.matches) run(); });
if (still.matches) { touring = false; state.lever = rangeAngle("P"); state.shaft = shaftAngle("P"); }
choose("P");
drawSelector(); drawSteering(); drawReadout();
