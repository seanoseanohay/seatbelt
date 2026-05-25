# Architecture (Current Thinking)

This document captures the current proposed architecture for the Seatbelt. It is expected to evolve.

## Guiding Principle

Build the minimum structure necessary to make constitutional enforcement **reliable and structural** once a session is active, while leveraging an existing high-quality agent runtime (Pi) for the actual work.

## High-Level Shape

```
User
  │
  ▼
Seatbelt CLI / TUI  ("seatbelt", "seatbeltcoder", etc.)
  ├── Session & Workspace Manager (protected worktree)
  ├── Profile + Constitution Loader
  ├── Governed Agent Controller
  │     └── Wraps Pi Agent / agentLoop + strong hooks
  ├── Constitutional Auditor (separate, stricter reviewer)
  ├── Correction Loop Engine
  └── Visibility / Notification Layer
```

The Seatbelt is the **primary interface** when active. Pi is the execution engine underneath.

## Key Components

### 1. Seatbelt CLI / TUI
- The thing you invoke for agentic work when you want protection.
- Loads profiles, sets up protected workspace, starts governed sessions.
- Provides high-level progress visibility during autonomous work.
- Handles promotion/export of clean changes.

### 2. Protected Workspace
- Usually a dedicated git worktree or isolated directory.
- All changes happen here while the seatbelt is active.
- Provides a clear boundary for what "this session's work" actually is.
- Makes diff-based auditing straightforward and trustworthy.

### 3. Profile & Constitution System
Layered configuration:
- **Core**: Shipped with Seatbelt (Pragmatic Programmer + Clean Code fundamentals).
- **Project**: Lives in the repo (`seatbelt.config.yaml` or similar).
- **Phase / Session**: Passed at invocation or via local override files.

The effective constitution for a session is the resolved combination of these.

### 4. Governed Agent Controller
This is the critical integration point with Pi.

Current best understanding (based on Pi's architecture):
- Use Pi's `Agent` class as the base implementer.
- Inject strong `beforeToolCall` logic (can block risky operations).
- Use `shouldStopAfterTurn` and custom signaling for checkpoints.
- Own the outer control flow so the Auditor can be required at structural boundaries.
- The controller (not the agent) decides when a checkpoint is needed and enforces the result.

Goal: Make the constitution difficult to bypass *inside* a Seatbelt session without forking Pi's inner loop if we can avoid it.

### 5. Constitutional Auditor
- Separate from the implementer (can use a different model or different settings).
- Given deliberately limited context: constitution + Change Contract + actual diff.
- Returns structured violations or "clean".
- Designed to be stricter and more literal than the implementer.

### 6. Correction Loop Engine
- When the Auditor finds issues, automatically starts a narrow repair iteration.
- The implementer is given explicit, limited instructions ("Fix only these violations").
- High-level visibility is emitted to the user.
- Loops until the Auditor passes or an override is recorded.

### 7. Checkpoint Strategy
Checkpoints are the moments when the Auditor *must* run. Initial ideas:
- After the agent signals a logical unit of work is complete.
- When crossing certain structural thresholds (files touched, diff size, cross-module changes).
- Explicit user signal ("I'm done with this piece").
- Periodic / time-based in very long sessions (with care).

The controller owns checkpoint decisions.

## Integration with Pi (Current Assessment)

Strengths of Pi for this use case:
- Excellent `beforeToolCall` / `afterToolCall` hooks that can block execution.
- `shouldStopAfterTurn` hook.
- Clean separation between `pi-ai` (models), `agent` loop, and higher layers.
- Strong multi-provider support via API keys.
- Event-driven design.

Risks / Open Questions:
- How much ownership of the outer loop we will need to take for reliable checkpoints.
- Whether `beforeToolCall` alone is sufficient for higher-level concerns (e.g., "this change is too big in scope").
- Long-term maintenance if we need deeper modifications.

## Visibility Model

During normal autonomous operation and correction loops, the user sees high-level, human-readable updates:

- `SRP violation in userService.ts (now handles auth + preferences + logging) → rewriting`
- `Duplication with existing preferenceLoader → extracting shared module`
- `Change exceeded original contract scope. Auditor forcing re-scoping.`

Detailed internal iteration logs are available on demand but not shown by default.

## Override Model

Overrides must be possible (seatbelt philosophy) but should be:
- Explicit
- Require justification
- Logged / visible in the session record
- Potentially surfaced in commit messages or a decisions artifact

## Non-Goals in v1 Architecture

- Deep real-time control of every token or tool call (too expensive).
- Perfect prevention of all possible violations (focus on high-leverage structural ones).
- Beautiful UI (CLI/TUI is sufficient and preferred for now).

## Evolution Path

We expect the architecture to be refined after:
- Deeper hands-on work with Pi's agent loop and harness.
- Building a narrow vertical slice.
- Real usage and observation of what actually causes bypass or friction.