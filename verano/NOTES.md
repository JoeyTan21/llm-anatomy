# 2014 Buick Verano as a rolling chassis: notes

Fig 1 is the car on a display stand with the body shell left off. Everything that carries, moves, stops or steers the car is there at true scale, and the one chain drawn in black is the range selector: the console lever, its cable, and the manual lever on the transaxle.

Open `verano.html` in a browser. Press `P`, `R`, `N` or `D` (or click the buttons under the card) to move the selector. Press `←` / `→` to turn the steering wheel a quarter turn at a time and `0` to centre it. Left alone, the figure tours the ranges and steers both ways.

## The question: how is the shift lever connected?

In an automatic, the lever is not connected to the gears at all. It is connected to one cable, and the cable to one shaft:

1. **The console lever** pivots on a bracket bolted to the floor tunnel. A pin on the lever drops into one of four notches in the bracket plate (the gate), which is the click you feel at P, R, N and D. The console trim that normally hides this is left off.
2. **The cable.** Below the pivot the lever has a short arm with an eye. The inner cable is pinned to that eye and runs inside a conduit that is clamped to the tunnel, through a grommet in the firewall, up the engine side of the firewall and across to a bracket on top of the transaxle. The conduit does not move; the inner cable slides inside it. In the figure the two black rods at the ends are the inner cable where it leaves the conduit.
3. **The manual lever** on the transaxle is a flat arm on the end of the **manual shaft**. The cable eye is pinned to it. One step of the console lever (8°) moves the cable about 1.25 cm, which turns the manual shaft one notch (16°). The arms are sized so the two ends travel the same distance.
4. **Inside the case**, three things hang on that shaft, none of them drawn because the case is closed:
   - the **detent lever**, a toothed plate with a spring-loaded roller, which holds the shaft in exactly one of its notches;
   - the **manual valve** in the valve body, which the detent lever pushes along its bore so that line pressure reaches the clutches for the chosen range (in N and P it reaches none);
   - the **park pawl** rod: in P the detent lever pushes a cam that forces a steel pawl into the teeth of the park gear on the output shaft, locking the wheels through the final drive.
5. **The internal mode switch** is the box on top of the case that the shaft passes through. It tells the transmission controller which range the shaft is in, which is how the dashboard knows and how the controller decides which clutches to apply in D.

So in D the lever's job ends at the manual valve. The actual 1st to 6th shifts are made by the controller applying hydraulic clutches on three planetary gearsets; the console lever never moves.

## What each part is

| In the figure | On the car |
|---|---|
| Base plate with a ruler strip | A display stand. The ticks are 10 cm apart with a long one every 50 cm. |
| Two long side members with cross members | The rocker sills and floor cross members of the unibody. The shell, floor pan and seats are left off. |
| Hump down the centre | The floor tunnel. The exhaust runs beside it, the shifter sits on it. |
| Tall plate across the car | The firewall (dash panel). The steering column and the shift cable pass through grommets in it. |
| Two beams forward of the firewall with a cup on each | The front rails with the strut towers. Each cup holds a coil spring and the top of a MacPherson strut; the nut on top is the strut's top mount. |
| Transverse block with a ribbed cover, four stubs and a box on the far side | The 2.4 L Ecotec LEA: block, head, cam cover with the coil pack, intake manifold with four runners and the throttle body, exhaust manifold on the firewall side. The oil pan is underneath, the oil filter and starter on the front face. |
| Pulley, belt and ribbed can on the right end | Crank pulley, accessory belt, alternator. |
| Box on the left end of the engine with a flat cover | The Hydra-Matic 6T45 six-speed transaxle: bell housing with the torque converter inside, main case, end cover. The round bulge low on the case is the differential. |
| Small box on top of the transaxle with a shaft out of its side | The internal mode switch, the manual shaft and the manual lever. |
| Two shafts to the front wheels, one long with a bracket | Left halfshaft; right intermediate shaft with its support bearing and right halfshaft. The bellows at each end are CV joint boots. |
| Rectangular frame under the engine | The front subframe (cradle). It carries the control arms, the steering rack and the sway bar. |
| Triangular arms to the wheels | Lower control arms, each on two bushes with a ball joint at the knuckle. |
| Bar across the subframe with two short links | The anti-roll (sway) bar in its bushes, with end links to the struts. |
| Tube across the car behind the axle, with a gearbox at its left end | The steering rack. The pinion housing takes the intermediate shaft from the column. |
| Rods from the rack ends to the wheels | Tie rods, on the steering arms of the knuckles. Steer and watch them. |
| Wheel, column and ribbed can beside it | Steering wheel, column, and the electric power steering motor on the column. Two universal joints link it to the rack. |
| Round can on the engine side of the firewall, with a cylinder and a box on it | Brake booster, master cylinder and fluid reservoir. |
| Finned plate at the front with a shroud and fan | Radiator, fan shroud, electric fan. The two hoses go to the thermostat housing and the water pump. |
| Boxes on the front corners | Air box with its intake tube (left), battery on its tray (right). |
| Beam across the rear with two arms forward | The twist beam (compound crank) rear axle: trailing arms on bushes under the sills, the torsion beam between them, hub plates at the ends. |
| Springs on the arms, angled rods behind the hubs | Rear coil springs on the arms up to the rails; shock absorbers. |
| Vertical link behind the beam with two rods to the body | The Watts Z-link that centres the axle sideways. It is what Buick added to the Cruze's beam axle. |
| Box ahead of the rear axle on the left | The fuel tank, with its filler neck to the left quarter. Drawn smaller than the real saddle tank. |
| Pipe from the exhaust manifold down the right side to the back | Downpipe, catalytic converter, resonator, over-axle pipe, muffler, tailpipe. |
| Discs inside the wheels with a block on the edge | Brake discs (vented at the front) and calipers. |

## The numbers

| Quantity | Value | Source |
|---|---|---|
| Wheelbase | 268.5 cm (105.7 in) | Manufacturer spec |
| Track front / rear | 153.2 / 154.2 cm | Manufacturer spec |
| Length / width / height | 467 / 181 / 148 cm | Manufacturer spec |
| Tyres | P235/45R18, radius 33.4 cm | Spec; radius = 18 in rim / 2 + 45% of 235 mm |
| Engine | 2.4 L Ecotec LEA, 180 hp, idle about 650 rpm | Spec |
| Transmission | 6T45, ratios 4.584 / 2.964 / 1.912 / 1.446 / 1.000 / 0.746, reverse 2.94 | GM 6T40 family data |
| Final drive | 3.23 | Verano 2.4 spec sheets |
| Wheel speed at idle in D | 650 / (4.584 × 3.23) = 44 rpm | Computed; ignores torque converter slip |
| Wheel speed at idle in R | 650 / (2.94 × 3.23) = 68 rpm | Computed |
| Steering ratio | about 15.5 : 1, road wheels limited to ±32° | Approximate: GM does not publish it for the Verano |

The 2.0 L turbo Verano uses the same transmission family and the same selector linkage; its final drive may differ slightly.

## What is approximate

- **Shapes.** The structure and the connections are real. The proportions of individual parts come from public cutaways and parts diagrams, not factory CAD. The engine block is drawn shorter than the real one so it fits between the rails at this scale.
- **Rails and sills.** They are drawn in segments so each can be painted in the right depth order against what it passes. Real unibody members are continuous stampings, though they do have joints.
- **The 6T45 inside.** Three planetary gearsets, three brake clutches and two rotating clutches; none of it is drawn. The manual valve, detent lever, park pawl and park gear are described above but hidden inside the closed case.
- **Fuel tank.** The real tank is a saddle shape that straddles the tunnel. It is drawn as a small box on the left so the exhaust and the tunnel stay clear.
- **Left out.** Pedals and the pedal box (hidden behind the firewall from this camera), brake lines, parking brake cables, the wiring harness, the spare wheel well, the floor pan, seats and the whole upper body.

## Files

| File | What it is |
|---|---|
| `spec.mjs` | The true numbers and the selector kinematics. The page inlines it. |
| `parts.mjs` | Parts that move: wheels with brakes and knuckles, the shifter, the manual lever, the inner cable rods, tie rods, the steering wheel spokes, the fan. Built the same way at build time and in the page. |
| `live.js` | Page logic: ranges, steering, wheel roll, the tour, the readout. |
| `build.mjs` | Static geometry and page assembly on the anatomy kit in `../.claude/skills/anatomy/kit`. Every part records its shape; `node build.mjs --audit` proves nothing passes through anything, every pipe and cable ends on a mount, every part is held, and every overlap is drawn in depth order. |
| `verano.html` | The built standalone page, light theme. |
| `shots/` | Reference screenshots: at rest in P, in D steered left, in R. |

Rebuild with:

```bash
node build.mjs
```

Prove the geometry with:

```bash
node build.mjs --audit
```
