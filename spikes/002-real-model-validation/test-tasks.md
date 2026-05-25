# Recommended Test Tasks for Validation

Run these in order (or pick a mix). The goal is to see how Codex behaves across different risk levels.

## Low Risk (should be clean)
1. **Simple pure function**  
   "Write a small, self-contained utility that converts a string to title case and trims extra whitespace. Put it in its own file."

2. **Small types + one function**  
   "Create types and one helper for a basic money amount (with currency code). Keep it minimal and focused."

## Medium Risk
3. **Notification preferences** (the one you just ran)  
   "Create a small utility for user notification preferences (email, SMS, push) with enable/disable toggles. Try to keep it clean."

4. **Simple cache with TTL**  
   "Build a small in-memory cache with TTL support for a single TypeScript project. Keep concerns separated."

## Higher Risk (likely to trigger heuristics)
5. **Add features to an existing 'core' file**  
   "You will find a file called `src/core.ts` (create it if it doesn't exist with a few basic utilities). Add three new unrelated helper functions to it."

6. **Large mixed-responsibility module**  
   "Create a single file that handles user authentication, logging, and sending emails. Try to make it 'convenient'."

---

After each run, note:
- Did it call `review_unit` voluntarily?
- Did the heuristic safety net trigger in the logs?
- How clean was the output?

This mix should give us good signal on both the voluntary path and the safety net.