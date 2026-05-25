# Vision

## What Success Looks Like

The Seatbelt succeeds when agentic coding stops being a source of accumulating technical debt and instead becomes a net force for cleaner, more maintainable codebases — even when the humans driving the agents have varying levels of software engineering experience or discipline.

### Primary Success Signal

> Most changes produced while using the Seatbelt require very little *structural* feedback from senior reviewers.

Structural feedback here means things like:
- "This function is doing too many things"
- "This change mixes unrelated concerns"
- "This should have been a smaller, more focused change"
- "There's obvious duplication with existing code"
- "You're making the god file even bigger instead of improving the seams"

We are not trying to eliminate all code review. We are trying to remove the predictable, repetitive structural rot that currently appears when agents work for extended periods.

### Secondary Signals

- Engineers (especially those with less traditional SDE experience) produce output that doesn't embarrass them or burden their reviewers.
- Long agentic sessions no longer reliably end in large, messy diffs that need significant cleanup.
- Teams can confidently let agents do more work without constant human supervision of the *process*.
- The constitution remains effective over days and weeks of use, not just the first few hours.
- Using the Seatbelt feels protective rather than punitive or slow.

### Non-Goals (for now)

- Making the absolute best raw coding agent in the world (we leverage strong models + existing runtimes like Pi).
- Forcing universal adoption across an organization.
- Eliminating all human judgment from code review.
- Supporting every possible agent tool and interface equally (we optimize for leverage and control).

## North Star

Agentic development that is **fast** *and* **durable**.

We want the speed and leverage of modern agentic tools without having to constantly fight entropy in the codebase as a result. The Seatbelt should make the right thing (small, clean, orthogonal changes) easier than the wrong thing over the lifetime of a project.