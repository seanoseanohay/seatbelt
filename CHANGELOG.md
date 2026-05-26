# Changelog

All notable changes to the Seatbelt project will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), with some adaptation for early-stage work.

---

## [Unreleased]

### Added
- Major expansion of automated test coverage, including a new real integration test suite (`test/integration/`) that exercises the full governed loop using a `FakeModelBackend` (real Worktree/git, real Controller/Auditor/ProgressTracker, only the model backend faked). Covers correction mode entry/exit, tool restrictions, multiple termination paths, real `.seatbelt/config.json` overrides, and worktree isolation.
- Expanded CLI smoke / REPL interaction tests that drive the interactive session via stdin.
- Light, disciplined extractions for better modularity and future phased behavior:
  - `ProgressTracker` (handles repetition, inactivity, and mutation safety heuristics previously embedded in runner).
  - `prompt-and-tools` module (`buildSystemPrompt` / `buildTools`).
- New `test:integration` npm script.

### Changed
- Runner and Controller cleaned up with the above extractions (improved SRP while preserving all behavior).
- Improved testability of core governance paths in preparation for config-driven rule groups and targeted repair passes.

### Notes
This release significantly strengthens verification of the core seatbelt guarantees (harness-owned timing, automatic bounded correction, multiple independent exit conditions) while following the project's own constitution around testing and modularity.

---

## [0.3.6] - 2026-05-25

### Added
- `ConstitutionalScope` — single authoritative owner for active constitutional rule groups (replaces scattered `CombinedRuleScope` + `repairScope` strings). Enables future UI-driven scope changes and cleaner targeted repair flows.
- Dedicated unit tests for `ConstitutionalScope`.
- Significant REPL / interactive session UX improvements focused on **Correction Mode**:
  - Much more scannable, boxed `ENTERING CORRECTION` announcement that includes currently active rule groups.
  - Persistent `[correction]>` prompt that stays across user turns while in correction (with automatic reminder line).
  - Clear "Correction resolved" success messaging when a burst brings the work back into compliance.
  - Enhanced `/status` command that shows iteration, allowed files, violation summary, and mode when in correction.
  - All REPL commands now correctly preserve correction prompt state.
- Living plan document for ongoing Correction Mode UX work (`notes/correction-mode-ux-plan.md`).

### Changed
- `runner.ts` now uses `ConstitutionalScope` when announcing correction entry.
- Interactive REPL in `cli.ts` tracks and respects correction state across bursts.
- Minor supporting cleanups in Controller / prompt generation to favor the new scope owner.

### Verified
- `npm run build` clean.
- 55/55 unit tests passing (including new ConstitutionalScope tests + all existing scope/repair behavior tests).
- 12/12 integration tests passing (real worktree flows with correction entry/exit).

### Notes
This release focuses on making the "seatbelt catching you" moment (correction) feel protective, clear, and usable in daily interactive sessions. All changes small, fully tested with real git worktrees, and build on the ConstitutionalScope seam introduced for future extensibility.

---

## [0.3.5] - 2026-05-25

### Added
- First-class `startRepairForRules(ruleGroups, ...)` API on `SeatbeltAgent` (and supporting `setRepairScope` on Runner/Controller) for targeted repair passes.
- `RuleScope` + `CombinedRuleScope` abstraction: explicit `repairScope` now correctly narrows both Auditor enforcement and prompt framing. Global config rules are the base; repair scope wins when present.
- Extracted constitutional rule modules under `src/harness/rules/` (avoid-god-files, small-focused-changes, high-risk-accretion) + barrel (`rules/index.ts`). Auditor now delegates cleanly; this is the documented extension point for new rule groups.
- 12 integration tests exercising the full real harness (including two end-to-end broad-pass → narrow `startRepairForRules` flows that prove the targeted repair vision with real worktrees, real Auditor, and only the model scripted).

### Changed
- Removed last `require` + `as any` / cast hack in the dynamic scope update path (`Controller.setRepairScope`). Runner now owns the repair intent and ensures it survives `initialize()` controller recreation.
- All three rule modules follow identical structure and JSDoc pattern.
- Minor test robustness fix (line count threshold) so high-risk-only repair scoping test actually triggers review.

### Verified
- `npm run build` clean.
- 49/49 unit tests passing (including dedicated `Auditor respects explicit RuleScope (repairScope takes precedence)` and per-module `check*` tests).
- 12/12 integration tests passing. The critical "highRisk only" narrow repair case now shows exactly the expected single violation type and scoped prompt language.

### Notes
This slice completes the core "targeted repair" capability: after a broad violating change, a subsequent agent can be handed only a precise subset of rule groups and receives correspondingly narrowed prompts + enforcement. All changes small, fully real-FS+git tested, and prepared for a future ConstitutionalScope state machine.

---

## [0.0.1] - Initial Exploration Phase

### Context
- Multi-turn discussion to define the real problem (agentic coding discipline decay).
- Strong constraints established:
  - Seatbelt model (voluntary to enter, hard once inside).
  - Must support autonomous correction loops with high-level visibility only.
  - Must work as daily driver, not high-ceremony gate.
  - Start narrow on Pragmatic Programmer + Clean Code principles.
  - Primary success metric: Most Seatbelt-produced changes require little structural feedback from senior reviewers.

### Key Early Decisions Captured In
- `DECISIONS.md`
- `PHILOSOPHY.md`
- `ARCHITECTURE.md`

---

*This file will become more conventional once we have actual releases or tagged versions.*