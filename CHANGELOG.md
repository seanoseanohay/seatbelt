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