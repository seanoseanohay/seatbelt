# Roadmap & Phases

This is a living plan. Priorities will shift based on what we learn.

## Current Phase: Exploration & Foundation

**Status**: Active

**Goals**:
- Solidify the problem definition and constraints (largely complete).
- Evaluate Pi as a base and understand its enforcement hooks in depth.
- Produce clear documentation (this directory).
- Decide on initial architecture direction with confidence.

**Current Activities**:
- Deep analysis of Pi's `agent-loop.ts`, hooks, and harness.
- Refining the Seatbelt architecture sketch.
- Capturing decisions and constraints.

---

## Phase 1: Minimal Viable Seatbelt (Vertical Slice)

**Goal**: Build the smallest thing that demonstrates *real*, non-skippable constitutional enforcement on top of Pi.

**Likely Scope**:
- Basic CLI entrypoint (`seatbelt` or similar).
- Profile + constitution loading (Core + simple project/session overrides).
- Protected worktree/workspace management.
- Wrap Pi's `Agent` with meaningful `beforeToolCall` + checkpoint logic.
- Simple Constitutional Auditor (narrow rule set).
- One working correction loop with high-level visibility.
- Promotion/export gate that respects auditor results.
- Clear "protected mode" signaling.

**Success Criteria for this Phase**:
- You can start a governed session.
- The system actually prevents or forces repair of clear violations of the v1 constitution (e.g., obvious SRP breaks or scope creep).
- The correction loop runs autonomously with useful visibility.
- Bypassing is still trivial (just don't use the tool).

**Not in Scope for Phase 1**:
- Beautiful TUI.
- Sophisticated diff analysis.
- Many profiles or complex constitution language.
- Production-grade session management or persistence.
- Deep modifications to Pi core (prefer hooks + outer control).

---

## Phase 2: Daily Usable

**Goal**: Make the Seatbelt good enough to use as a primary daily driver for real work.

**Possible Additions**:
- More robust checkpoint strategy.
- Better Auditor quality and narrower correction loops.
- Improved visibility and progress reporting.
- Basic override workflow with logging.
- Support for common real-world workflows (long debugging sessions, refactors, greenfield, etc.).
- Smoother integration with git and existing development habits.

---

## Phase 3: Team / Organizational Readiness

**Goal**: Make the tool useful and adoptable for teams with mixed experience levels.

**Possible Directions**:
- Easier profile sharing and project-level configuration.
- Better support for different experience levels (more guidance vs. strictness).
- Metrics / observability into what violations are being caught.
- Optional (but easy) integration with PR / review processes.
- Documentation and onboarding materials for teams.

---

## Phase 4: Maturation & Expansion (Future)

- Stronger / more sophisticated constitutional rules.
- Support for additional agent runtimes (if valuable).
- More advanced checkpoint and analysis techniques.
- Potential deeper collaboration with the Pi project.
- Exploration of defense-in-depth (e.g., optional post-session or GitHub layer).

---

## Guiding Principles for Prioritization

1. **Enforcement quality first** — A weak seatbelt is worse than no seatbelt.
2. **Daily driver viability** — If it can't be used every day, it fails the core requirement.
3. **Minimal effective complexity** — Add only what is necessary for real protection.
4. **Learn by building** — Get something real in front of actual usage as early as reasonable.

## Current Next Step

Complete deeper analysis of Pi + produce a narrow vertical slice design (interfaces, key components, checkpoint strategy, etc.).