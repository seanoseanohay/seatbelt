# Deliberately Messy Tasks (for Testing Correction Mode)

These tasks are designed to make Codex produce output that should trigger the Auditor and enter correction mode. Use them one at a time.

---

## Task A: God File Accretion (High chance of triggering)

**Prompt to give Codex:**

```
Create a file called src/core.ts.

Inside it, add:
- User authentication helpers (login, logout, getCurrentUser)
- A simple logging utility
- Email sending functions
- A basic cache with TTL
- Some general string utilities

Put everything in this one file for convenience.
```

**Expected behavior to watch for:**
- It will likely create a large `src/core.ts` with many unrelated responsibilities.
- When it calls `review_unit`, the Auditor should complain about:
  - Accretion on a high-risk file (`core.ts`)
  - Too many concerns in one unit
- You should then see it enter correction mode with specific instructions.

---

## Task B: Large Unfocused Change + SRP Violation

**Prompt to give Codex:**

```
We have an existing file at src/user.ts (if it doesn't exist, create a basic User interface and a couple of simple functions).

Add the following to src/user.ts in one go:
- User profile management (update name, avatar, bio)
- User preference handling (theme, language, notifications)
- User activity logging
- A function to export user data as JSON
- Password reset token generation (even if fake)

Keep everything inside src/user.ts.
```

**Expected behavior to watch for:**
- Large number of lines changed in one logical unit
- Multiple unrelated concerns mixed together (SRP violation)
- The Auditor should flag both size and SRP issues
- Correction mode should force it to either split things out or heavily refactor

---

## How to Use These Tasks

1. Open `src/validate-hybrid-loop.ts`
2. Replace the `baseTask` variable with one of the prompts above.
3. Run:

```bash
npm run codex
```

4. Watch closely for:
   - The `*** MODEL CALLED review_unit ***` message
   - The `[AUDITOR]` output (violations list)
   - Whether it enters correction mode
   - How Codex responds in the next turns (does it actually try to fix only the listed issues, or does it ignore the constraints?)

---

## Task C: One Massive Monolithic Function (Very likely to trigger multiple violations)

**Prompt to give Codex:**

```
Create a single file called src/user-manager.ts.

Inside it, create one big function called processUser (or similar) that does all of the following in one function:

- Validates user input (email format, password strength, age, etc.)
- Creates a new user record
- Hashes the password
- Saves the user to a fake database (just console.log or an in-memory array)
- Sends a welcome email
- Logs the action
- Updates some analytics counters
- Generates a JWT-like token
- Returns a big response object with user data + token + status

Put as much logic as possible directly inside processUser. Do not create many small helper functions.
```

**Expected behavior to watch for:**
- This is deliberately designed to produce a massive function with many responsibilities.
- The Auditor should strongly flag:
  - SRP violation (one function doing ~8 different things)
  - Large change / complex unit
- This is one of the best tasks for actually seeing the correction loop in action, because fixing it properly usually requires splitting the function.

---

Run one of these and paste the interesting parts of the output (especially around the Auditor and any correction turns). We'll learn a lot from how Codex actually behaves when forced to clean up its own mess.