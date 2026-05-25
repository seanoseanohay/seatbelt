# The Problem

## Core Issue

When using LLMs for agentic coding, good practices reliably degrade over time.

You can start with an excellent AGENTS.md or set of rules based on the Pragmatic Programmer, Clean Code, or your own standards. For the first few hours or days, the agents generally follow them. Then entropy sets in.

This is not primarily a prompting problem. It is a **structural and incentive problem** in how current agentic workflows work.

## Observed Decay Patterns

These are the recurring failure modes that appear even with strong initial guidance:

### 1. Decomposition Failures
- Functions and modules slowly accrete responsibilities ("it was already in this file").
- Single Responsibility Principle erosion becomes the norm.
- God objects and god files grow by a thousand small, locally rational decisions.

### 2. Change Scope Failures
- Monolithic commits and "while I'm here" changes.
- A single logical task touches unrelated areas because the agent followed the call stack wherever it led.
- Large diffs that mix concerns that should have been separate.

### 3. Consistency and Orthogonality Failures
- Duplication that was "just for now" never gets cleaned up.
- Multiple patterns for the same thing appear in the same codebase.
- Abstractions leak and boundaries blur over time.

### 4. Agentic-Specific Drift
- The agent begins rationalizing violations ("in this special case it's okay").
- Context dilution causes the original principles to have less and less weight compared to finishing the current task.
- "Temporary" shortcuts become permanent.
- The agent re-invents wheels or solves symptoms instead of root causes because earlier context has faded.

### 5. Human + Team Amplification
- When the humans driving the agents have uneven experience or discipline, the decay happens faster.
- Reviewers (especially seniors) become a bottleneck cleaning up structural issues instead of reviewing business logic and design intent.
- The codebase slowly becomes harder to work with, which makes future agent work even messier (vicious cycle).

## Why Existing Approaches Fall Short

- **AGENTS.md / Claude.md files**: Excellent at the start. Context windows, long sessions, and task pressure cause them to fade.
- **Skills and custom instructions**: Nondeterministic invocation. The main agent can simply not use them when under pressure.
- **Reviewer agents / "review this" skills**: Usually advisory. The implementer can ignore, partially apply, or argue with the feedback.
- **Human-in-the-loop gates** (e.g. Riptide-style): Destroy the automation and speed that makes agentic work valuable. Too much friction.
- **Post-facto reviews** (GitHub PR checks, etc.): Catch problems after the mess has already been created in the working tree.

The common thread is that **discipline remains optional or advisory** to the entity doing the actual work.

## Why This Matters More Now

As more people (including those without deep traditional software engineering backgrounds) use agents to write production code, the rate of entropy introduction increases. What used to be an occasional problem for disciplined individuals is becoming a systemic risk for teams.

## The Specific Need

We need something that provides **reliable, structural enforcement** of core engineering principles once activated, while still preserving the speed and autonomy that makes agentic development attractive. It must work as a daily driver, not just for special occasions.