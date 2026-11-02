# Memory hierarchy: notes

Fig 1 is a small plant on a base plate. On the left, a tall flow rack is the warehouse. A motor cart runs on a track to a machine bed on the right, where a four-pocket index table turns crates under a spindle head, which is the worker. The worker is driven at a fixed speed by a motor with a flyball governor. Pick a job and watch which one stops and waits.

Open `memory-hierarchy.html` in a browser. Click the figure, press `1` or `2`, or use the buttons to switch between softmax and matmul. Left alone, it tours both jobs on a loop. The first click or key press stops the tour.

## Every part and what it stands for

The figure shows **one SM** of a V100. The cart and the worker are that SM's share of the chip's bandwidth and math. All 80 SMs run the same picture side by side, so the ratios are the chip's ratios.

| Part in the figure | Real GPU term |
|---|---|
| Flow rack (the warehouse), its shelves and stored crates | **HBM2** global memory, 32 GB. Big and far away. |
| Two roller lanes at the foot of the rack | The addresses the kernel reads from (lane at the back) and writes to (lane at the front). |
| A crate | One **tile** of 24 KiB (6,144 fp32 values). |
| Four raw blocks proud of a crate's rim | Data not yet computed on. They sink in as the worker processes them. |
| A crate with a lid and strap | A finished tile, ready to be written back to HBM. |
| Bridge plate at the rack face | The memory controller / HBM interface. |
| The track | The path from HBM through L2 to the SM. It is long because HBM is slow to reach. |
| The cart, with its own fixed-speed motor | **HBM bandwidth** for this SM: 900 GB/s ÷ 80 SMs = 11.25 GB/s. One crate per leg, both directions sharing it. |
| One cart leg (1.2 s in the figure) | 24 KiB ÷ 11.25 GB/s = **2.185 µs** of GPU time. |
| Cart lane at the back / lane at the front | A **load** (global → shared) and a **store** (result → global). |
| Machine bed (the workbench) | The **SM**. |
| Four-pocket index table, its pockets IN, STAGE, WORK, OUT | **Shared memory / SRAM**, 96 KiB per SM, exactly four 24 KiB tiles. IN and STAGE are prefetch (double-buffering), WORK is the tile being computed on, OUT is the tile waiting to be stored. |
| The table indexing a quarter turn in a fifth of a leg | Moving data inside shared memory is fast: roughly **20×** HBM bandwidth. |
| Index drive gearbox behind the table | The SM's load/store units and scheduler that rotate buffers. |
| Spindle head, quill and cutter (the worker) | The SM's **CUDA cores**, the fp32 ALUs. |
| Cutter turning | The ALUs doing FLOPs on the tile under them. |
| Motor, belt and flywheel on the column | The **clock**. |
| Flyball governor, always spinning | The fixed peak: 15.7 TFLOP/s ÷ 80 = **196 GFLOP/s** per SM. It never speeds up, however long the worker waits. |
| Gauge at the warehouse end | How busy the memory path is: achieved bandwidth ÷ peak bandwidth. |
| Gauge on the bench | How busy the math is: achieved FLOP/s ÷ peak FLOP/s. |
| Selector knob, left or right | Which **kernel** is running: softmax or matmul. |
| The lit part (black edge) | The **bottleneck**: the cart's deck for softmax, the spindle head for matmul. |
| Readout | Bytes moved and FLOPs done since you picked the job, and which side is waiting and for what share of the time. |

## The numbers

| Quantity | Value | Where it comes from |
|---|---|---|
| HBM bandwidth, whole V100 | 900 GB/s | Spec. |
| fp32 peak, whole V100 | 15.7 TFLOP/s | Spec, SXM2 boost clock. |
| SMs | 80 | Spec. |
| Shared memory per SM | 96 KiB | Spec, configurable maximum. |
| **Ridge point** | 15.7e12 ÷ 900e9 = **17.4 FLOP/byte** | A kernel must do this much math per byte moved to keep the ALUs busy. |
| Softmax intensity | 5 FLOP ÷ 8 byte = **0.625 FLOP/byte** | Fused fp32 softmax: about 5 FLOPs per element (max, subtract, exp, sum, divide), with 4 bytes read and 4 bytes written per element. |
| Softmax attainable | 0.625 × 900 GB/s = **0.56 TFLOP/s = 3.6% of peak** | Roofline: min(peak, intensity × bandwidth). |
| Matmul intensity, N = 1024 fp32 | 2N³ ÷ (3N² × 4 bytes) = N/6 = **171 FLOP/byte** | The minimum traffic: read A and B once, write C once. |
| Matmul attainable | 15.7 TFLOP/s, **compute-bound** | 171 is well past the ridge. |

How the figure's time is set:

- The cart moves one 24 KiB crate per leg. The worker processes one crate per round trip, which moves 2 crates (in and out).
- The worker's time per crate, in legs, is 2 × intensity ÷ ridge.
  - For softmax that is 0.072 legs, so the cart runs all the time and the worker is busy about **3.6%** of it.
  - For matmul it is 19.6 legs, so the worker runs all the time. The cart is busy 2 legs out of every 19.8, about **10%**, which is 17.4 ÷ 171.
- The busy readings are measured over a whole number of the job's steady cycles. They settle to the values above about one cycle after a switch: about 10 s for softmax and 24 s for matmul.

## A correction to the brief

The brief said softmax does "~5 FLOPs per byte" and so runs at "under a third of peak". The ~5 is **per element**, not per byte. In fp32 each element costs 8 bytes of HBM traffic, so softmax is at about **0.6 FLOP/byte**. That puts it at about **3.6%** of peak, not 29%. A naive multi-pass softmax that reads the input three times is worse still.

The conclusion is the same, and stronger: softmax is memory-bound, and the only way to make it faster is to move fewer bytes. Fuse it into the kernel next to it, as FlashAttention does with the attention softmax, or use fp16/bf16 to halve the bytes. A faster worker changes nothing.

## Simplifications

- **The matmul round trip.** Each matmul crate goes back out after its work, so bytes are split half reads and half writes. The real minimum split for a matmul is two-thirds reads and one-third writes. The totals keep the true FLOPs per byte, which is what decides the bottleneck.
- **Real matmul traffic.** A real tiled matmul kernel re-reads tiles of A and B from L2 and HBM, so its effective intensity is lower than N/6. At 1024 it is still well past the ridge, and cuBLAS SGEMM runs near peak on a V100.
- **L2 and registers.** L2 cache (6 MB) and the register file are not drawn. They sit between the track and the bench and between the bench and the worker.
- **Latency.** The cart's travel time stands for bandwidth, not latency. On a real GPU many requests are in flight at once.

## Files

| File | What it is |
|---|---|
| `model.mjs` | The pure model: V100 numbers, the two jobs, and the simulation. The page inlines it, so the readout and the motion run on the same code. |
| `parts.mjs` | Crates, table marks, cutter and spoke marks, gauge needles and governor, built the same way at build time and in the page. |
| `live.js` | Page logic: steps the model, places crates, spins the drive and eases the gauges. |
| `build.mjs` | Static geometry and page assembly, using the anatomy kit in `../.claude/skills/anatomy/kit`. |
| `memory-hierarchy.html` | The built standalone page, light theme. |
| `shots/` | Reference screenshots of each job at steady state. |

Rebuild with:

```bash
node build.mjs
```

Use `node build.mjs --dark` for a dark variant.
