# Changelog

All notable changes to the Seatbelt project will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), with some adaptation for early-stage work.

---

## [Unreleased]

### Added
- Initial documentation set in `~/seatbelt/` to capture problem, vision, philosophy, architecture, constitution, roadmap, decisions, integration notes, and glossary.
- Working name and core metaphor established as "Seatbelt".
- Decision to evaluate Pi (`@earendil-works/pi`) as the primary agent runtime base due to its strong governance-relevant hooks.

### Changed
- Refined problem framing from "personal discipline tool" to supporting mixed-experience teams where the humans may not be strong practitioners themselves.
- Shifted from "occasional tool" to "daily driver" requirement ("I put my seatbelt on every time").

### Notes
This is the very beginning of the project. Most activity so far has been requirements clarification, constraint definition, and architectural exploration rather than implementation.

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