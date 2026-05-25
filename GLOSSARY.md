# Glossary

This document defines terms used in the Seatbelt project to keep communication precise.

## Core Concepts

**Seatbelt**  
The overall system / harness. A voluntary but strongly enforcing constitutional layer for agentic coding. Once activated, the rules have structural force. Easy to ignore entirely by not using the tool.

**Protected Session / Protected Mode**  
A session started through the Seatbelt CLI/TUI. While in this mode, the constitution is actively enforced via hooks, checkpoints, and the Auditor.

**Constitution**  
The set of principles being enforced (initially focused on Pragmatic Programmer + Clean Code fundamentals: SRP, small focused changes, DRY, orthogonality, boy scout rule, etc.).

**Core / Project / Phase Profiles**  
The layered configuration system:
- Core: Shipped with Seatbelt.
- Project: Lives in the repository.
- Phase/Session: Temporary or task-specific overlays.

**Implementer**  
The agent (powered by Pi + chosen LLM) that does the actual coding work.

**Constitutional Auditor (or just Auditor)**  
A separate, stricter reviewer component. Evaluates changes against the constitution at checkpoints. Can use the same or a different model than the Implementer.

**Correction Loop**  
When the Auditor finds violations, the system automatically drives a narrow, targeted repair iteration. The Implementer is given limited scope ("fix only these violations").

**Checkpoint**  
A moment when the Auditor must run. Examples: after a logical unit of work, when structural thresholds are crossed, or on explicit user signal.

**Change Contract**  
A lightweight artifact (produced early in a task) describing the intent and expected scope of a piece of work. Used by the Auditor to detect scope creep.

**Hard Gate (inside the Seatbelt)**  
Once a protected session is active, violating the constitution is not optional. The Auditor + correction loop (or blocking) will force repair or require an explicit override.

**Override**  
A deliberate, logged exception where the human allows a violation to stand. Must be justified. Part of the seatbelt philosophy (protection, not prison).

## Pi-Specific Terms

**beforeToolCall**  
Pi hook that runs before a tool executes. Can return `{ block: true, reason }` to prevent execution.

**afterToolCall**  
Pi hook that runs after a tool executes. Can modify the result or request early termination of the turn.

**shouldStopAfterTurn**  
Pi hook that allows deciding whether to exit the agent loop after a turn completes.

**Agent (Pi class)**  
The higher-level class in Pi that most consumers use. Exposes the governance-relevant hooks as public properties.

**agentLoop / runLoop**  
The core low-level loop in `pi-agent-core`.

## Process Terms

**Daily Driver**  
The requirement that the Seatbelt must be suitable for all normal agentic coding work, not just special/high-ceremony tasks.

**Structural Feedback**  
Review comments about architecture, modularity, change size, duplication, and separation of concerns (as opposed to business logic or domain correctness).

**Slop Pit**  
The slow accumulation of low-quality structural patterns (god files, monolithic changes, eroded abstractions) that makes future agent work and human maintenance increasingly painful.

## Future Terms (to be defined when needed)

- Promotion Gate
- Visibility Layer
- Profile Resolution
- Auditor Context Starvation Strategy
- etc.