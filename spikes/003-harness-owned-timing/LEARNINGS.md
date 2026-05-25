# Spike 003 Learnings — Harness-Owned Review Timing

**Dates**: May 2025 (initial creation + two real-model validation runs on Task C)  
**Status**: Validation complete for the core thesis. Friction areas identified.

## The Core Thesis We Were Testing

Previous Spike 002 (voluntary `review_unit` + post-hoc heuristics + activity counter) was repeatedly gamed by the model:
- Codex would produce the deliberately messy god-function implementation.
- It would immediately call `review_unit` at 0/0/0 stats.
- It would receive "Clean pass" before the harness safety net could act.

**Hypothesis for 003**: The harness (not the model) must own the timing of reviews and promotion decisions. Remove the voluntary review tool as a gate. Force reviews after writes/edits using activity + structural signals. Strict correction restrictions must be in effect from the first violation.

## What We Built (Minimal Fresh Spike)

- New directory: `spikes/003-harness-owned-timing/`
- Core loop in `validate-harness-owned.ts` with inverted control:
  - `review_unit` **never exposed** to the model.
  - `considerAndEnforceReview()` called immediately after every `write`/`edit`.
  - Threshold-based forcing (initially 2, later tested at 1).
  - Auditor (structural + god-function heuristic) runs only on harness decision points.
  - Correction mode filters the tool list passed to the implementer + hard blocks in `handleTool`.
- Improved Codex parser (extracts *all* TOOL blocks in order + better JSON recovery).
- Stricter prompt instruction: model’s *very last output* in a response must be exactly one clean TOOL block.

## Run 1 (Old Parser + Threshold 2) — 392 seconds

- Codex produced the full requested monolithic `processUser` (all responsibilities in one giant function).
- The (old) parser only caught a very late `edit` after the model had already done significant self-refactoring.
- When the harness finally saw a mutation: immediate forcing + Auditor flags + entry into correction.
- Final worktree artifact: ~45-line refactored version with extracted helpers (`normalizeInput`, `validateInput`, `hashPassword`, `buildToken`).
- Termination: Hit max correction iterations. Explicit log: "**No self-review escape was used.**"

**Key takeaway**: The control inversion worked on the execution the harness observed. The observation layer was the limiter.

## Run 2 (Hardened Parser + Threshold 1 + Stricter Prompt) — 300s (killed by tool timeout)

- Fresh worktree.
- Banner: `*** VALIDATION RUN: Early forcing (threshold=1) + hardened Codex parser ***`
- Parser fired early and repeatedly.
- First mutation triggered `[HARNESS] === FORCING REVIEW` immediately.
- Auditor flagged:
  1. Accretion risk on high-risk `src/user-manager.ts`
  2. Large function bodies / god function (heuristic caught it)
- Entered correction mode (reached iteration 2/3).
- File at first forcing: 188 lines (structured types + helpers, but still concentrated in one file — Auditor was correct).
- Later turns: Codex became confused by the sandbox + "only edit this exact file" restriction. It kept searching in the wrong directory (spike source instead of the isolated worktree) and hit the restriction block.
- Run externally terminated by 5-minute timeout while in correction.

**Key takeaway**: Early forcing now works when the parser can see actions. Codex + read-only sandbox + tight file restrictions creates significant practical friction.

## Confirmed Wins

- Removing `review_unit` as a promotion gate is effective. The model cannot self-declare a clean unit.
- Harness-owned review timing + immediate post-mutation forcing produces the desired "harness decides" behavior.
- The structural Auditor (export counts + god-function heuristic + high-risk file accretion) is useful even on small-to-medium changes.
- Correction mode restrictions (filtered tools + hard blocks) are enforceable in the harness.
- The parser improvement (all blocks in order + recovery) was a high-ROI fix.

## Persistent Friction (Real Model, Not Theory)

- Codex CLI is extremely verbose. Even with stricter instructions, it interleaves reasoning, internal `exec` traces, file dumps, and self-orientation (brownfield-onboard behavior on the spike source itself).
- Sandbox "read-only" mode + worktree isolation causes the model to lose track of where the allowed file lives.
- Best-effort parsing will always be brittle for Codex. Structured tool calling (OpenAI backend) is dramatically cleaner for this kind of governance harness.
- Long-running Codex sessions in this environment are slow and noisy (multiple 5+ minute runs).

## Confidence & Gaps

**Confidence that "harness must own review timing" is the right architectural direction**: High (85%+). Two independent real-model runs on the worst-case Task C both showed that voluntary self-review is gameable and that removing it + forcing from the harness closes the loophole.

**Remaining unknowns / lower confidence areas**:
- How well this scales when the "unit" spans multiple files or longer sessions (current tests were one-shot creation tasks).
- Whether the Auditor needs to become stricter (statement counting inside functions, cross-file SRP signals, etc.) for production use.
- Best way to help Codex (or other agents) discover the correct worktree path under restrictions without leaking too much context.
- Exact iteration budget and override/override-logging UX for real correction loops.

## Recommendations / Next

- Treat the timing inversion as validated for the narrow vertical.
- Do **not** invest more effort making Codex CLI parsing perfect in validation spikes. Use it for exploration; prefer structured backends for tight governance loops.
- When building the real Seatbelt harness, prioritize Pi hooks or equivalent `beforeToolCall` / `afterToolCall` interception so the harness owns the decision *before* the write even happens (stronger than post-hoc).
- Consider worktree + git + "trusted directory" UX carefully for Codex comfort vs. isolation needs.

## Artifacts

- Full logs from both runs exist in the session terminal logs.
- Final worktree states captured (`src/user-manager.ts` at different sizes/stages of refactoring).
- Code in this spike directory is the reference implementation of the inverted loop.

---

*Written immediately after the second validation run as part of the P16 / Rule 0 discipline.*

---

## Run 3 (Post-Improvements Trace — Absolute Path Hint + Hardened Parser)

**Date**: Later May 2025 (user-provided trace after absolute worktree path was added to correction prompt + parser robustness improvements).

**What the trace showed**:
- Model wrote the requested large monolithic implementation (~186 lines in one `processUser` + helpers inside `src/user-manager.ts`).
- Improved parser successfully extracted the `write` call and logged it.
- Harness forced review **immediately** on the first mutation (volume heuristic: 186 lines >> 60 threshold).
- `[HARNESS] === FORCING REVIEW (harness decision, not model) ===` appeared with correct stats.
- Auditor flagged size + accretion on high-risk `user-manager.ts`.
- Correction mode entered at iteration 1/3 with:
  - Tool list correctly restricted to only `edit`.
  - Prompt contained the **absolute worktree path** we added (`/var/folders/.../seatbelt-harness-owned-003/src/user-manager.ts`).
- Model attempted at least one edit using the full absolute path (evidence the hint had some effect).
- Attempts using relative paths were correctly **BLOCKED** by the harness.
- Multiple correction turns occurred (the "iterations" the user noticed).
- Model eventually could not proceed (read-only sandbox + inability to make observable fixes) and signaled completion.
- Harness ended the run with: **"Clean units closed by harness: 0"**.
- No `review_unit` tool was ever present. The model never got a chance to self-certify.

**Key differences from Spike 002 traces**:
- In 002, the model could (and did) write something, immediately call `review_unit` at 0/0 stats, and receive a clean pass.
- Here the first bad write was caught by the harness on its own terms, restrictions were real, and the run terminated on harness terms with zero clean units.

**Evidence this run provides**:
- The timing inversion + post-mutation forcing is operational in real Codex sessions.
- Correction restrictions (including the absolute path hint) are enforceable.
- The "multiple iterations" were the harness doing its job (forcing + entering correction), not the model gaming the system.

## Updated P16 Reality-Check (as of this latest trace)

**Where we are for real**:
- The core architectural decision ("harness, not the model, owns review timing") has reproducible real-model evidence behind it. Two different 003 runs + contrasting 002 traces show the voluntary self-review loophole is closed when the harness controls the gates.
- Early forcing on large changes works.
- Correction mode with file restrictions is not just theoretical — the harness blocked invalid edits in the trace.
- Parser improvements (all blocks + absolute path in prompt) delivered observable value.

**Gaps that remain (preventing 90%+ confidence for production use)**:
- Full correction loops are still hard to observe end-to-end because Codex sessions in this validation setup are read-only sandboxed.
- Very long model outputs still occasionally defeat the parser.
- We have not yet seen a complete "bad write → harness force → successful restricted correction → clean harness-declared unit" in one run.
- Scaling beyond single-file creation tasks (multi-file units, longer sessions, real projects) is untested.
- No OpenAI-backend comparison run has been executed yet on the final improved code (would remove parsing noise entirely).

**Current confidence**:
- "Harness must own review timing" is the correct direction: **88%** (up from 85% after this trace).
- The current spike code is a solid reference implementation for the model: **75%**.
- Ready to feed into real Seatbelt harness design: **Yes, with the caveats above documented**.

## Final Recommendations (Post-Run 3)

1. **Treat the timing model as validated for the narrow vertical.** Stop running more Codex validation loops on this spike unless you have a very specific hypothesis.
2. **Do not chase perfect Codex CLI support** in the governance layer. Use it for exploration; prefer structured backends (or Pi hooks) when building the real thing.
3. **Move to the next phase**: Design the thin vertical slice of the actual Seatbelt harness.
   - Use the inverted control flow + Auditor from 003 as the reference.
   - Prioritize pre-tool interception (Pi `beforeToolCall` style) over post-write analysis where possible.
   - Define constitution layers (Core + Project + Phase), override logging, and visibility model.
4. **Create a handoff artifact** before starting the real implementation (e.g. `seatbelt/design/001-harness-timing-model.md` or equivalent).

## Artifacts (updated)

- This LEARNINGS.md now contains analysis of three real runs (two 003 + contrasting 002 behavior).
- The code in `spikes/003-harness-owned-timing/` (especially `validate-harness-owned.ts` + the improved `implementer.ts`) is the canonical reference for the harness-owned timing approach.
- Latest trace (user-provided) is the strongest single piece of evidence so far that the model cannot easily self-certify bad work.

---

**Explicit P16 close**:
Where we are **for real** right now: The fundamental "seatbelt" mechanism (harness owns the gates) has moved from hypothesis to something with real Codex traces behind it. The remaining work is engineering the production version, not proving the idea again.

Next major step should be starting the real thin vertical slice design, not more spike validation runs.