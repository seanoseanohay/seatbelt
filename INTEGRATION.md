# Pi Integration Notes

This document captures what we know about integrating with Pi for constitutional enforcement.

## Why Pi Looks Promising

- Clean separation: `pi-ai` (model layer) vs `agent` (loop + hooks) vs `coding-agent` (TUI + tools).
- First-class, production-grade hooks that are directly useful for governance:
  - `beforeToolCall` — can block tool execution with a reason. Runs after validation.
  - `afterToolCall` — can rewrite results or force early termination (`terminate: true`).
  - `shouldStopAfterTurn` — can decide to exit the loop after a turn.
  - `prepareNextTurn` — allows injecting context or changing model/config between turns.
- Strong event stream for observability.
- Excellent multi-provider support via API keys (exactly the "plug in any brain" model we want).
- Designed with extensibility and control in mind (aligns with wanting real enforcement rather than polite suggestions).

## Key Integration Surfaces (as of current analysis)

### Low-Level Loop (`packages/agent/src/agent-loop.ts`)
- `beforeToolCall` and `afterToolCall` are wired into `prepareToolCall` and `finalizeExecutedToolCall`.
- These work for both sequential and parallel tool execution modes.
- `shouldStopAfterTurn` is checked after `turn_end`.

### Agent Class (`packages/agent/src/agent.ts`)
- Exposes `beforeToolCall`, `afterToolCall`, `prepareNextTurn`, etc. as public mutable properties.
- This is likely the most practical surface for the Seatbelt controller to use.

### AgentHarness (`packages/agent/src/harness/agent-harness.ts`)
- The higher-level wrapper used by the full coding agent.
- Already routes some hooks through its own event system (`tool_call`, `tool_result`).
- May be a good place to observe or extend behavior.

### Tooling Layer (in `packages/coding-agent`)
- File system tools (read, write, edit, bash) are defined here.
- These are the highest-leverage places for constitutional blocking (especially write/edit operations that increase complexity or violate SRP).

## Open Questions / Risks

1. **Loop Ownership**
   - Can we get reliable "this logical unit of work is complete" signals without taking ownership of the outer loop?
   - How easy is it to inject mandatory auditor reviews at natural boundaries using only the existing hooks?

2. **Hook Power vs. Higher-Level Concerns**
   - `beforeToolCall` is excellent for blocking individual dangerous operations.
   - It is weaker for broader concerns like "this change has grown too large in scope" or "you're accreting on a god module."
   - We will likely need a combination of per-tool blocking + higher-level checkpoint logic owned by the Seatbelt.

3. **Self-Modification Risk**
   - Because Pi agents can edit skills and extensions, we must ensure constitutional enforcement cannot be casually disabled from inside a session.

4. **Maintenance Burden**
   - How stable are these hooks across Pi releases?
   - Do we want to contribute enforcement-friendly improvements upstream?

## Current Leaning (as of last architecture sketch)

- Primary integration: Wrap Pi's `Agent` class + provide strong hook implementations.
- Own the outer control flow for checkpoint decisions and auditor invocation.
- Use `beforeToolCall` for immediate blocking of high-risk mutations.
- Use `shouldStopAfterTurn` + custom signaling or injected review tools for broader architectural review points.
- Prefer not to deeply fork `runLoop` in v1 unless the hooks prove insufficient.

## Next Actions on Integration

- [ ] Read full implementation of `prepareToolCall` and `finalizeExecutedToolCall`.
- [ ] Study how the coding-agent defines its core file tools.
- [ ] Prototype a minimal wrapper that exercises `beforeToolCall` + `shouldStopAfterTurn` for constitutional purposes.
- [ ] Decide whether to treat Pi as a black-box dependency or plan for deeper collaboration/forking.