# Constitution (v1 Focus)

This document defines the principles the Seatbelt will initially enforce.

## Scope for v1

We are deliberately starting narrow.

**Primary focus**: Classic Pragmatic Programmer + Clean Code fundamentals, with emphasis on the violations that most commonly appear in agentic work and create the highest review burden.

We are **not** trying to encode every possible good practice in the first version.

## Core Principles (Initial Set)

### 1. Small, Focused Changes
- Each logical unit of work should be as small and cohesive as reasonably possible.
- Avoid "while I'm here" expansions of scope.
- A change should do one thing well.

### 2. Single Responsibility
- Functions, classes, and modules should have one clear reason to change.
- When adding behavior, prefer extending or composing rather than bloating existing units.
- Watch for functions that start handling multiple concerns (I/O + business logic + validation + presentation, etc.).

### 3. Orthogonality & Separation of Concerns
- Unrelated concepts should not be mixed in the same module or function.
- Changes in one area should have minimal ripple effects in unrelated areas.
- Prefer clear seams and boundaries over convenience.

### 4. DRY (Don't Repeat Yourself) — with judgment
- Obvious duplication should be removed or prevented when it creates maintenance burden.
- We are not dogmatic about every 3-line similarity.
- Focus on duplication of *knowledge* and *behavior*, not just text.

### 5. Boy Scout Rule / Leave It Cleaner
- When touching code, prefer to improve its structure slightly rather than just adding to the mess.
- Do not make existing problems meaningfully worse as a side effect of your change.

### 6. Change Cohesion
- A single commit / logical change should tell a coherent story.
- Mixed concerns in one diff are a smell (even if each individual piece is "correct").

### 7. Avoid Accretion on God Files / God Modules
- When a file or module is already large and complex, be extremely reluctant to add more to it without addressing the structure.
- Prefer introducing new modules with clear responsibilities.

## How These Will Be Operationalized

These principles will be turned into:
- Concrete guidance for the Auditor (what to look for in diffs and change contracts).
- `beforeToolCall` blocking logic for especially dangerous patterns (e.g., large new functions in already-problematic files).
- Checkpoint rules that trigger the Auditor.

The exact detection strategies will be refined during implementation. The goal in v1 is high-signal, low-false-positive enforcement of the above spirit, not perfect static analysis.

## Future Expansion

Later versions may add:
- Stronger testing expectations
- Error handling and observability standards
- Security / correctness properties relevant to specific domains
- Team-specific rules

These will be added as optional or project-level profiles, not by bloating the Core.

## Tone

The constitution should be treated as serious but not religious. The Auditor should be strict on structural issues while allowing reasonable, well-justified exceptions (via the override mechanism).