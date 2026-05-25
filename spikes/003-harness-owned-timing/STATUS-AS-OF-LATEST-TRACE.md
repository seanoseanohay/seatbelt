# Spike 003 — Status as of Latest User Trace (May 2025)

**Date of this note**: Immediately after user provided the multi-iteration correction trace.

## Current Assessment

The core hypothesis of Spike 003 has been validated with real Codex traces:

- Harness successfully forced review on the first bad large write (no model self-review possible).
- Correction mode with real restrictions was entered.
- Absolute path hint in the prompt was visible and used by the model at least once.
- Invalid edit attempts were blocked.
- Run ended on harness terms ("0 clean units closed by harness").
- Multiple iterations the user observed were correction turns under harness control.

This is materially better than the 002 behavior the user also pasted (where `review_unit` at 0 stats produced clean passes).

## What Was Just Done

- LEARNINGS.md extended with "Run 3" analysis + explicit P16 reality-check.
- Confidence in the timing inversion raised to 88%.
- Clear recommendation recorded: stop further spike validation loops; move to real thin vertical slice design.

## Recommended Immediate Next Phase

Start the real Seatbelt harness thin vertical slice:
- Use the control flow + Auditor from this spike as the reference implementation.
- Design the constitution/profile system (Core + Project + Phase).
- Decide on interception point (Pi hooks vs post-tool vs hybrid).
- Define visibility, override, and logging model.
- Pick one narrow end-to-end (e.g., "write a file" under governance) and implement it properly.

## Open Items Before Starting Real Work

- Decide whether to do one clean OpenAI-backend run on the final code for higher signal (optional but recommended for the record).
- Agree on the exact scope of the first vertical slice.

## Handoff

All relevant code, traces, and analysis now live in:
- `spikes/003-harness-owned-timing/`
- Updated LEARNINGS.md (this directory)
- Root DECISIONS.md entry on harness-owned timing

Do not run more Codex validation on this spike unless testing a very specific new hypothesis. The idea has enough evidence.

---

Written per user's own Rule 0 / handoff hygiene requirements.