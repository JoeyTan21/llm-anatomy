// The truth the figure runs on. Pure: no DOM, no kit. The page inlines this file.
// Units inside the simulation are "legs": the time the cart needs to move one crate.

export const V100 = {
  hbmBytes: 32e9, // HBM2, 32 GB
  hbmBW: 900e9, // bytes per second, all SMs together
  sms: 80,
  smemBytes: 96 * 1024, // shared memory per SM
  smemRatio: 20, // shared memory is roughly 20x HBM bandwidth
  peak: 15.7e12, // fp32 FLOP per second, all SMs together
};

// Roofline ridge point: FLOPs a kernel must do per byte moved to keep the math busy.
export const RIDGE = V100.peak / V100.hbmBW; // 17.4

// The figure shows one SM: its share of HBM bandwidth and its share of the math.
export const PER_SM = { bw: V100.hbmBW / V100.sms, peak: V100.peak / V100.sms };

// Four crates fill the bench exactly: 4 x 24 KiB = 96 KiB of shared memory.
export const SLOTS = 4;
export const CRATE = V100.smemBytes / SLOTS;
export const LEG_SECONDS = CRATE / PER_SM.bw; // 2.18 microseconds per crate

export const JOBS = {
  softmax: {
    key: "softmax",
    name: "softmax",
    // fused fp32 softmax: about 5 FLOPs per element (max, subtract, exp, sum, divide),
    // 4 bytes read and 4 bytes written per element
    flopsPerElement: 5,
    bytesPerElement: 8,
    get flopsPerByte() { return this.flopsPerElement / this.bytesPerElement; },
  },
  matmul: {
    key: "matmul",
    name: "matmul",
    // C = A B, square N x N fp32: 2 N^3 FLOPs over at least 3 N^2 x 4 bytes
    N: 1024,
    get flopsPerByte() { return (2 * this.N ** 3) / (3 * this.N ** 2 * 4); },
  },
};

// One crate's round trip moves 2 crates of bytes (in and out); the work done on it
// is that many bytes times the job's FLOPs per byte.
export const flopsPerCrate = (job) => 2 * CRATE * job.flopsPerByte;
// How long the worker needs for one crate, in legs: (FLOPs / peak) / (CRATE / bw).
export const workLegs = (job) => (2 * job.flopsPerByte) / RIDGE;
// Roofline: what the whole GPU can reach on this job.
export const attainable = (job) => Math.min(V100.peak, job.flopsPerByte * V100.hbmBW);

// How a leg is spent, and how long the bench takes to index (the fast part).
export const TIMING = { xfer: 0.25, travel: 0.75, index: 0.2, lid: 0.15 };

// Station order around the index table (it turns +90 degrees each index).
export const IN = 0, STAGE = 1, WORK = 2, OUT = 3;

export function createSim(jobKey) {
  const s = {
    job: jobKey, t: 0, since: 0, switched: 0, busyCart: 0, busyWorker: 0, hist: [], bytes: 0, flops: 0,
    next: 0, crates: {},
    cart: { phase: "ready", side: "wh", timer: 0, pos: 0, lanes: [null, null] },
    table: { slots: [null, null, null, null], indexing: false, timer: 0, turn: 0 },
    whIn: [], whOut: [],
  };
  const make = (state) => {
    const id = s.next++;
    s.crates[id] = { id, state, progress: state === "done" ? 1 : 0, lid: state === "done" ? 1 : 0, alpha: 1, work: null, a: null, b: null, p: 1 };
    return id;
  };
  s.make = make;
  for (let k = 0; k < 4; k++) { const id = make("raw"); s.whIn.push(id); place(s, id, { kind: "whIn", k }); }
  for (let k = 0; k < 3; k++) { const id = make("done"); s.whOut.push(id); place(s, id, { kind: "whOut", k }); }
  const first = s.whIn.shift();
  s.cart.lanes[0] = first; place(s, first, { kind: "cart", lane: 0 });
  topUp(s);
  for (const slot of [IN, STAGE, WORK]) { const id = make("raw"); s.table.slots[slot] = id; place(s, id, { kind: "slot", s: slot }); }
  return s;
}

function place(s, id, loc) { const c = s.crates[id]; c.a = loc; c.b = loc; c.p = 1; }
function move(s, id, to) { const c = s.crates[id]; c.a = c.b; c.b = to; c.p = 0; }

// Keep four raw crates queued in the warehouse lane; a new one slides in from the back.
function topUp(s) {
  while (s.whIn.length < 4) {
    const id = s.make("raw");
    s.crates[id].alpha = 0;
    s.whIn.push(id);
    place(s, id, { kind: "whIn", k: 4 });
  }
}

export function setJob(s, jobKey) {
  if (s.job === jobKey) return;
  s.job = jobKey;
  s.switched = s.t;
  s.since = 0; s.bytes = 0; s.flops = 0;
  // the crate under the worker keeps its progress fraction; what is left is now this job's work
  for (const id of s.table.slots) if (id !== null && s.crates[id].state === "raw" && s.crates[id].work !== null) s.crates[id].rescale = true;
}

export function stepSim(s, dt) {
  const job = JOBS[s.job];
  s.t += dt; s.since += dt;
  const { cart, table } = s;

  // crates in motion and fading
  for (const c of Object.values(s.crates)) {
    if (c.p < 1) c.p = Math.min(1, c.p + dt / (c.a.kind === "slot" && c.b.kind === "slot" ? TIMING.index : TIMING.xfer));
    if (c.state === "done" && c.lid < 1) c.lid = Math.min(1, c.lid + dt / TIMING.lid);
    if (c.fade === "in") { c.alpha = Math.min(1, c.alpha + dt / TIMING.xfer); if (c.alpha >= 1) c.fade = null; }
    if (c.fade === "out") { c.alpha = Math.max(0, c.alpha - dt / TIMING.xfer); if (c.alpha <= 0) delete s.crates[c.id]; }
  }

  // the cart
  if (cart.phase === "ready") {
    if (table.slots[IN] === null && !table.indexing && cart.lanes[0] !== null) { cart.phase = "go"; cart.timer = TIMING.travel; }
  } else if (cart.phase === "dock") {
    if (!table.indexing) benchXfer(s);
  } else if (cart.phase === "go") {
    s.busyCart += dt;
    cart.timer -= dt;
    const done = 1 - Math.max(0, cart.timer) / TIMING.travel;
    cart.pos = cart.side === "wh" ? done : 1 - done;
    if (cart.timer <= 0) {
      cart.side = cart.side === "wh" ? "bench" : "wh";
      const loaded = cart.side === "bench" ? cart.lanes[0] : cart.lanes[1];
      if (loaded !== null) s.bytes += CRATE; // one crate has crossed between HBM and the SM
      if (cart.side === "bench") { if (table.indexing) cart.phase = "dock"; else benchXfer(s); }
      else whXfer(s);
    }
  } else if (cart.phase === "xfer") {
    s.busyCart += dt;
    cart.timer -= dt;
    if (cart.timer <= 0) {
      if (cart.side === "bench") { cart.phase = "go"; cart.timer = TIMING.travel; }
      else cart.phase = "ready";
    }
  }

  // the index table
  if (table.indexing) {
    table.timer -= dt;
    if (table.timer <= 0) {
      table.indexing = false;
      const old = table.slots;
      table.slots = [old[OUT], old[IN], old[STAGE], old[WORK]];
      table.turn += 1;
    }
  } else if (cart.phase !== "xfer" || cart.side !== "bench") {
    const work = table.slots[WORK];
    const free = work === null || (s.crates[work].state === "done" && s.crates[work].lid >= 1);
    const any = table.slots.some((id) => id !== null);
    if (table.slots[OUT] === null && free && any) {
      table.indexing = true;
      table.timer = TIMING.index;
      table.slots.forEach((id, slot) => { if (id !== null) move(s, id, { kind: "slot", s: (slot + 1) % SLOTS }); });
    }
  }

  // the worker: fixed speed, only works on a raw crate standing still under it
  const at = table.slots[WORK];
  s.working = false;
  if (!table.indexing && at !== null && s.crates[at].state === "raw" && s.crates[at].p >= 1) {
    const c = s.crates[at];
    if (c.rescale) { c.work = workLegs(job); c.rescale = false; }
    if (c.work === null) c.work = workLegs(job);
    const left = (1 - c.progress) * c.work;
    const used = Math.min(dt, left);
    c.progress = Math.min(1, c.progress + used / c.work);
    s.busyWorker += used;
    s.flops += used * LEG_SECONDS * PER_SM.peak;
    s.working = used > 0;
    if (c.progress >= 1 - 1e-9) { c.progress = 1; c.state = "done"; }
  }

  // busy totals, sampled for the windowed utilisation
  const last = s.hist[s.hist.length - 1];
  if (!last || s.t - last.t >= 0.05) {
    s.hist.push({ t: s.t, cart: s.busyCart, worker: s.busyWorker });
    while (s.hist.length > 2 && s.t - s.hist[1].t > 60) s.hist.shift();
  }
}

function benchXfer(s) {
  const { cart, table } = s;
  cart.phase = "xfer"; cart.timer = TIMING.xfer;
  const raw = cart.lanes[0];
  if (raw !== null) { table.slots[IN] = raw; cart.lanes[0] = null; move(s, raw, { kind: "slot", s: IN }); }
  const done = table.slots[OUT];
  if (done !== null) { cart.lanes[1] = done; table.slots[OUT] = null; move(s, done, { kind: "cart", lane: 1 }); }
}

function whXfer(s) {
  const { cart } = s;
  cart.phase = "xfer"; cart.timer = TIMING.xfer;
  const back = cart.lanes[1];
  if (back !== null) {
    cart.lanes[1] = null;
    s.whOut.forEach((id, k) => move(s, id, { kind: "whOut", k: k + 1 }));
    s.whOut.unshift(back);
    move(s, back, { kind: "whOut", k: 0 });
    while (s.whOut.length > 4) { const gone = s.whOut.pop(); s.crates[gone].fade = "out"; }
  }
  const next = s.whIn.shift();
  cart.lanes[0] = next;
  move(s, next, { kind: "cart", lane: 0 });
  topUp(s);
  s.whIn.forEach((id, k) => { move(s, id, { kind: "whIn", k }); if (s.crates[id].alpha < 1) s.crates[id].fade = "in"; });
}

// What the readout says. Bytes and FLOPs count from the moment the job was picked.
// Busy fractions are measured over a whole number of the job's steady cycles (the
// worker's crate time for matmul, the cart's 2-leg round trip for softmax), so once one
// window has passed since the switch they read the steady state exactly.
export function windowOf(jobKey) {
  const period = Math.max(2, workLegs(JOBS[jobKey]) + TIMING.index);
  return period * Math.ceil(8 / period);
}
export function ledger(s) {
  const from = Math.max(s.t - windowOf(s.job), s.switched);
  const past = s.hist.find((h) => h.t >= from) || { t: s.t, cart: s.busyCart, worker: s.busyWorker };
  const span = Math.max(s.t - past.t, 1e-9);
  const cart = Math.min(1, (s.busyCart - past.cart) / span), worker = Math.min(1, (s.busyWorker - past.worker) / span);
  const settled = s.t - s.switched >= windowOf(s.job);
  return { cart, worker, settled, bytes: s.bytes, flops: s.flops, seconds: s.since * LEG_SECONDS, waiting: cart >= worker ? "worker" : "cart" };
}
