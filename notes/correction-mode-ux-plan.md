# Correction Mode UX Improvement Plan

**Goal**: Make entering, being in, and exiting correction feel clear, protective, and low-anxiety — while staying true to small focused changes and real testing.

**Current Problems** (as of 0.3.5 + ConstitutionalScope work):
- Correction announcement is a big raw block of text (runner.ts).
- Prompt only changes to `[correction]>` inside a single burst; the interactive REPL always resets to normal prompt after each user instruction.
- Very little persistent reminder of "you are restricted right now".
- Active rules during a repair pass are not surfaced well while correcting.
- Exiting correction (clean review) is silent or low-signal.
- Model restrictions are only in the system prompt; the human has poor visibility.
- `/status` and `/violations` exist but are not prominent during correction.

## Prioritized Micro-Slice Checklist

### Phase A: Visibility & Announcement (High leverage, low risk)

1. **Improve the ENTERING CORRECTION announcement**
   - Make the block more scannable (use better formatting, icons/emojis if tasteful, group violations).
   - Include active rule groups (leverage ConstitutionalScope).
   - Add a short "What this means for you" sentence.

2. **Add persistent correction indicator in the REPL**
   - Track whether the *last* burst left us in correction.
   - Change the prompt to `[correction]>` and keep it until the user successfully exits correction or explicitly resets.
   - Show a one-line reminder on prompt (e.g. "Correction active — restricted to edit on X files").

3. **Surface active rules + restrictions on demand and automatically**
   - Enhance `/status` to always show current correction state + active rules (from ConstitutionalScope).
   - Consider auto-printing a short "Restrictions active" line when the user is about to type in correction mode.

### Phase B: Transitions & Recovery

4. **Make clean exit from correction more visible and celebratory**
   - When a clean review happens while in correction, print a clear "Correction resolved" message.
   - Reset prompt back to normal only on confirmed clean exit.

5. **Better max-corrections handling in interactive mode**
   - Give clearer guidance instead of just terminating.

### Phase C: Richer State & Model/Human Alignment

6. **Expose "current correction context" via a new lightweight command or automatic header**
   - `/context` or enhance existing commands to show: active rules, current violations, allowed files, iteration.

7. **Improve the correction instructions shown to the *model*** (prompt-and-tools)
   - Make the "You are in STRICT CORRECTION MODE" language stronger and reference the specific active rules.

8. **(Later) Live status line / footer while in correction** (if we stay with readline or move toward light TUI)

## Guiding Constraints for All Slices
- Every slice must include real testing (unit + relevant integration where possible).
- Prefer small, reviewable changes.
- Leverage `ConstitutionalScope` and existing `CorrectionState`.
- Do not change the fundamental "harness owns timing" contract.
- Verify with `npm run build && npm run test:unit && (spot-check integration)` after each slice.
- Update relevant help text and the interactive experience.

## Success Criteria (for the whole effort)
- When the harness enters correction, a new user immediately understands:
  1. What went wrong
  2. Which rules are being enforced right now
  3. Exactly what they (and the model) are allowed to do
  4. How to get out of correction cleanly
- The experience feels protective rather than punishing.

---
Last updated: 2026-05-25 (post 0.3.5 + ConstitutionalScope introduction)
