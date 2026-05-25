# Philosophy & Constraints

## The Seatbelt Model

The fundamental design constraint is the **seatbelt metaphor**:

- It must be easy and low-friction to *not* use the system at all.
- Once you choose to use it, the protection should be real and difficult to bypass casually.
- The system should feel protective rather than authoritarian or annoying.

This means:
- No global enforcement or "you must use this" policies in the base design.
- No heavy human approval gates on every step (we rejected Riptide-style interaction).
- Strong internal rules once a protected session is active.
- Clear signaling when you are inside a protected session.

## Daily Driver Requirement

The user intends to use this for **all** agentic coding work ("I put my seatbelt on every time I get into a car").

This has major implications:
- The experience must be competitive with raw agent use on a daily basis.
- Friction must be acceptable for the value delivered.
- Autonomous operation (with good visibility) is essential — the human should not be in the loop on every auditor finding.
- The system must not feel like "extra ceremony" for normal work.

## Friction Tolerance

- Some slowdown compared to raw agents is acceptable.
- Constant human input or approval is **not** acceptable.
- The value must clearly exceed the cost for the people using it (especially under time pressure).

## Enforcement Style

Inside a Seatbelt session:
- The constitution is not advice. It is a structural constraint.
- The implementer should not be able to easily ignore or work around the rules.
- Automatic correction loops are preferred over blocking + human intervention.
- Overrides must be possible but deliberate and visible.

Outside a Seatbelt session:
- Anything goes. No judgment, no nagging, no hooks.

## Scope and Audience

- Must work for mixed teams: experienced SDEs *and* people with little traditional engineering background.
- Primary value is raising the floor on structural quality before human review.
- Long-term behavior change in humans is a nice-to-have, not a requirement.

## Technology Philosophy

- Leverage existing strong agent runtimes (currently evaluating Pi) rather than rebuilding everything.
- Prefer minimal effective intervention over elegant but heavy architectures.
- The harness should feel like infrastructure that makes the right thing easier, not a tax.
- Multi-model support (via API keys) is a first-class requirement.

## What We Are Not Trying To Build

- A better general-purpose coding agent.
- A mandatory enterprise governance platform.
- A system that tries to make bad agents produce great code through sheer prompting.
- Another set of optional skills or reviewer agents.

## Core Tension We Must Navigate

Speed + Autonomy + Strong Constitutional Enforcement

Most existing approaches only achieve two of these three at once. The Seatbelt's job is to push the boundary on all three simultaneously.