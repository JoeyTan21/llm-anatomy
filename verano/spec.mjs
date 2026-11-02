// The truth the figure runs on: the 2014 Buick Verano (Delta II platform, 2.4 L Ecotec
// LEA, Hydra-Matic 6T45 six-speed automatic, front-wheel drive). Pure: no DOM, no kit.
// Lengths in centimetres. x runs forward along the car, y to the driver's left, z up.
// The front axle is x = 0 on the ground, z = 0.

export const CAR = {
  wheelbase: 268.5, // 105.7 in
  trackFront: 153.2, // 60.3 in
  trackRear: 154.2, // 60.7 in
  length: 467.1, // 183.9 in
  width: 181.4, // 71.4 in
  height: 147.6, // 58.1 in
  overhangFront: 93.5, // length minus wheelbase, split as measured on the car
  tire: "P235/45R18",
  tireWidth: 23.5,
  tireRadius: (18 * 2.54) / 2 + 0.45 * 23.5, // 33.4 cm
  engine: "2.4 L Ecotec LEA, transverse, 180 hp",
  idleRpm: 650,
};

// Hydra-Matic 6T45 (RPO MH7): three simple planetary gearsets, three brake clutches and
// two rotating clutches. Final drive 3.23:1 in the Verano 2.4.
export const GEARBOX = {
  name: "6T45",
  ratios: { 1: 4.584, 2: 2.964, 3: 1.912, 4: 1.446, 5: 1.0, 6: 0.746, R: 2.94 },
  finalDrive: 3.23,
};

// Steering: electric power steering, rack and pinion. The overall ratio is about 15.5:1
// on this platform (approximate: GM does not publish it for the Verano).
export const STEERING = { ratio: 15.5, maxRoadWheel: 32, approximate: true };

// The range selector. The console lever, the cable and the transmission's manual lever are
// one rigid chain: the lever's angle sets the cable travel, which sets the manual shaft's
// angle, which sets the detent lever's notch, the manual valve's position and whether the
// park pawl is pushed into the output gear.
export const RANGES = ["P", "R", "N", "D"];
export const SELECTOR = {
  leverStep: 8, // degrees of console lever per position
  leverArm: 9, // cm from the lever pivot down to the cable eye
  shaftStep: 16, // degrees of manual shaft per detent notch
  shaftArm: 4.5, // cm, manual lever length to the cable eye
};
// Cable travel per position: both arms are sized so one step moves the same length.
export const cableStep = () => SELECTOR.leverArm * Math.sin((SELECTOR.leverStep * Math.PI) / 180);

export function rangeInfo(range) {
  const fd = GEARBOX.finalDrive;
  const wheelRpm = (ratio) => CAR.idleRpm / (ratio * fd);
  switch (range) {
    case "P":
      return { range, text: "Park · pawl locks the output gear", short: "Park", ratio: null, wheelRpm: 0, dir: 0 };
    case "R":
      return { range, text: `Reverse · ${GEARBOX.ratios.R} × ${fd} = ${(GEARBOX.ratios.R * fd).toFixed(1)} : 1`, short: `Reverse ${(GEARBOX.ratios.R * fd).toFixed(1)} : 1`, ratio: GEARBOX.ratios.R * fd, wheelRpm: wheelRpm(GEARBOX.ratios.R), dir: -1 };
    case "N":
      return { range, text: "Neutral · no clutch applied, wheels free", short: "Neutral", ratio: null, wheelRpm: 0, dir: 0 };
    default:
      return { range: "D", text: `Drive, 1st · ${GEARBOX.ratios[1]} × ${fd} = ${(GEARBOX.ratios[1] * fd).toFixed(1)} : 1`, short: `1st ${(GEARBOX.ratios[1] * fd).toFixed(1)} : 1`, ratio: GEARBOX.ratios[1] * fd, wheelRpm: wheelRpm(GEARBOX.ratios[1]), dir: 1 };
  }
}

// Road-wheel angle for a steering-wheel angle, both in degrees.
export const roadWheelAngle = (wheelDeg) => Math.max(-STEERING.maxRoadWheel, Math.min(STEERING.maxRoadWheel, wheelDeg / STEERING.ratio));
