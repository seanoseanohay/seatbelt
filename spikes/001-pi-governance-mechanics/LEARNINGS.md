# Spike 001 - Learnings

## Experiment 1: beforeToolCall (Completed)

**Date run:** 2026-05-24

### Key Observations
- `beforeToolCall` is genuinely powerful for preventive enforcement on individual mutation operations.
- Simple heuristics can already catch meaningful structural violations (large changes, god-file accretion).
- Limitation: Per-tool granularity. Weak for higher-level "is this logical unit coherent?" concerns.

## Experiment 2: Checkpoint Mechanisms (Completed)

**Date run:** 2026-05-24

### Key Observations

**Approach 1 – Custom Tool Interception (`review_unit`)**
- Highest quality signal when the model cooperates.
- Gives a very clean, explicit moment to run the full Auditor.
- Major risk: Heavy dependence on model cooperation for triggering.
- Easy to make mandatory via `beforeToolCall` interception.

**Approach 2 – `shouldStopAfterTurn` + External Heuristics**
- Lowest dependence on model cooperation.
- Seatbelt retains strong control using real state (file count, diff size, worktree state).
- Can act as a reliable safety net.
- Risk: Heuristics can feel crude or trigger at awkward times.

**Approach 3 – Steering / prepareNextTurn Injection**
- Keeps things inside the normal conversation flow.
- Weakest "hard gate" feeling.
- Most vulnerable to the model ignoring or working around the review request under pressure.

### Synthesis & Recommendation
The strongest position for the narrow vertical slice is a **hybrid**:

- Use Approach 2 (`shouldStopAfterTurn` + heuristics on structural signals) as the **reliable safety net**.
- Use Approach 1 (custom `review_unit` tool) as the **preferred, higher-fidelity path** when the model cooperates.
- Treat Approach 3 as a supportive/secondary technique rather than primary.

This combination gives us both enforcement reliability and semantic quality without over-relying on model goodwill.

### Implications for Vertical Slice
- We now have a much clearer checkpoint strategy.
- The "hard gate" can be achieved without needing the model to be perfectly well-behaved.
- This significantly de-risks the overall Seatbelt architecture.

## Experiment 2b: Hybrid Micro-Experiment (Completed)

**Date run:** 2026-05-24

### Key Observations from Combined Simulation

Three scenarios were run with the hybrid model active:

1. **Model cooperates well** → High-quality voluntary review triggered cleanly via `review_unit` tool.
2. **Model completely ignores the review tool** → External heuristic safety net successfully forced a checkpoint on file count and line change thresholds.
3. **Mixed behavior** → Safety net caught early drift. Later the model voluntarily used the review tool for a higher-quality review.

**Strengths observed:**
- The hybrid provides both quality (when possible) and reliability (always).
- Prevents the dangerous "slow death by many small un-reviewed changes".
- Gives the Seatbelt two different "review signals" — one semantic (model-driven) and one structural (Seatbelt-driven).

**Weaknesses / Tensions observed:**
- Two different review "flavors" (voluntary high-signal vs forced heuristic). This may require different handling in the Auditor.
- Threshold tuning is important (the values used in the spike were arbitrary).
- Still benefits from the model being somewhat trained to use the `review_unit` tool.

### Updated Recommendation for Vertical Slice
Proceed with the hybrid model. Make the external heuristic thresholds (files changed, lines changed) configurable per profile so teams can tune strictness.

Treat voluntary `review_unit` calls as the preferred path (richer context for the Auditor) but never depend on them exclusively.

## Experiment 3: Minimal Auditor + Correction Loop (Completed)

**Date run:** 2026-05-24

### Key Observations

Three scenarios were simulated with a minimal rule-based Auditor + Correction Loop:

1. **Clean unit** → Passed on first Auditor run (no correction needed).
2. **Medium violation (SRP + size)** → Required multiple iterations. The loop sometimes stalled when the simulated implementer gave weak responses to the narrow repair instructions.
3. **Serious violation (god file accretion)** → Also failed to converge within max iterations in the weak-response case.

**Important findings:**
- A narrow Auditor + Correction Loop can resolve moderate issues in 1–2 iterations when the implementer responds well to scoped instructions.
- Non-convergence is a real and likely risk. Some units are fundamentally messy and the model may not (or cannot) fix them with narrow instructions.
- We will need a clear policy for "max correction iterations + override with justification".
- Different checkpoint triggers (voluntary vs forced heuristic) may produce different quality of input for the Auditor.

### Implications for Vertical Slice
- A simple rule-based Auditor is probably sufficient for v1.
- The Correction Loop must be treated as a bounded process, not an infinite one.
- Good visibility for the user during correction iterations is important (they need to understand why work is taking longer).
- Override mechanism is not optional — it is required for cases where the loop does not converge.

## Overall Spike 001 Summary (as of 2026-05-24)

Through Experiments 1–3 we have de-risked the core governance mechanisms:

- **Prevention layer** (`beforeToolCall`) → Works well for local structural rules.
- **Checkpoint layer** → Hybrid (custom tool + external heuristics) provides both quality and reliability.
- **Auditor + Correction Loop** → Feasible with simple rules, but must be bounded with a clear override path.

The technical foundation for a meaningful Seatbelt on top of Pi looks significantly more viable than it did at the start of the spike.

## Next Recommended Work
- Feed all learnings into an updated Narrow Vertical Slice Design Document.
- Then move toward building the thin end-to-end slice (as per the 1 → 2 → 3 plan).