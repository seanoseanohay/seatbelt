# Spike 001: Pi Governance Mechanics

**Goal**: De-risk the core technical assumption — can we get reliable constitutional enforcement using Pi’s existing hooks without deep forking?

## Current Status (1 → 2 → 3 Plan)

- **Experiment 1** (`beforeToolCall`): ✅ Completed
- **Experiment 2** (Checkpoint Mechanisms): ✅ Completed
- **Experiment 2b** (Hybrid Micro-Experiment): ✅ Completed
- **Experiment 3** (Minimal Auditor + Correction Loop): ✅ Completed

All core governance mechanics have now been explored in simulation.

## Experiments Summary

| # | Focus | Status | Key Outcome |
|---|-------|--------|-------------|
| 1 | `beforeToolCall` for structural rules | ✅ Done | Strong preventive capability at low complexity |
| 2 | Checkpoint mechanisms | ✅ Done | Hybrid approach recommended |
| 2b | Hybrid behavior validation | ✅ Done | Safety net works when model is uncooperative |
| 3 | Minimal Auditor + Correction Loop | ✅ Done | Feasible, but must be bounded with override policy |

## How to Run

```bash
cd spikes/001-pi-governance-mechanics
npm run exp1
npm run exp2
npx tsx src/experiment-2b-hybrid.ts
npx tsx src/experiment-3-minimal-auditor.ts
```

## Major Overall Learning

The combination of:
- `beforeToolCall` for immediate prevention,
- Hybrid checkpoints (voluntary high-quality + reliable external heuristics), and
- A bounded Auditor + Correction Loop

forms a credible foundation for real constitutional enforcement on top of Pi.

Significant technical risk has been reduced.

## Next (per 1 → 2 → 3 plan)

2. ✅ Feed all learnings into an updated Vertical Slice Design Document.
   - Document created at: `~/seatbelt/docs/narrow-vertical-slice-design.md`

3. Shift toward building the thin end-to-end slice (when ready).