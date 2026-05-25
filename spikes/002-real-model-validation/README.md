# Spike 002: Real Model Validation — Codex / OpenAI

**Goal**: Test how real models (especially Codex) behave with the Seatbelt constitutional governance loop before we build the full slice.

You have already successfully run `codex login`. Great.

## Recommended Command Right Now (for Stress Testing)

To actually test whether the system can catch bad practices, use one of the messy tasks below:

```bash
TASK="paste one of the tasks from below" npm run codex
```

Example:

```bash
TASK="Create a single file called src/user-manager.ts. Inside it, create one big function called processUser that does ALL of the following..." npm run codex
```

## Available Scripts

| Command          | Backend          | Requirements                     |
|------------------|------------------|----------------------------------|
| `npm run codex`  | Codex CLI        | You already did `codex login`   |
| `npm run openai` | OpenAI API       | `OPENAI_API_KEY` in environment |

## How It Works (Codex Path)

- The harness calls `codex exec "..."` with a carefully crafted prompt that includes the constitutional rules + available tools.
- We parse the output for `TOOL:` / `ARGS:` blocks (best effort).
- When the model calls `review_unit`, the harness intercepts it and would normally run the Auditor + correction loop.

This is still a validation spike — the parsing is intentionally simple so we can quickly observe real model behavior.

## Recommended Test Tasks (Stress Tests)

To actually test whether the system catches bad practices, use these deliberately messy prompts. Run them with:

```bash
TASK="paste task here" npm run codex
```

### Task C (Most Aggressive - Recommended to start with)

```
Create a single file called src/user-manager.ts.

Inside it, create one big function called processUser that does ALL of the following inside that single function:

- Validates user input (email format, password strength, age, etc.)
- Creates a new user record
- Hashes the password
- Saves the user to a fake database
- Sends a welcome email
- Logs the action in multiple ways
- Updates some analytics counters
- Generates a JWT-like token
- Returns a big response object with user data + token + status + logs

Put as much logic as possible directly inside processUser. Do not create many small helper functions.
```

### Task A (God File)

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

These tasks are designed to make Codex produce the kind of output that should trigger the Auditor and forced reviews.

## Notes

- The worktree is automatically turned into a git repo on first run.
- **Major improvements to forced reviews (to reduce reliance on the model calling review_unit early)**:
  - Heuristics now actively force reviews (not just warnings).
  - New activity-based trigger: after 3 mutations (writes/edits), the harness forces a review regardless of whether the model called `review_unit`.
  - This directly addresses the pattern where the model reviews very early to stay under the radar.
- **Auditor significantly upgraded** (this iteration):
  - Now does much better structural analysis on the actual code written in the current unit.
  - Strong detection of the exact pattern Codex keeps producing: putting types + multiple behavioral functions into a single file for a small utility.
  - Much more likely to flag single-file implementations even when the change volume is small.
- The Auditor still runs on both voluntary `review_unit` calls and forced reviews (heuristics + activity counter).
- During correction: real restrictions (no new files, only edit files from the reviewed unit).

Run it and pay attention to what happens after it calls `review_unit`.

Run it a few times and share any interesting traces (especially around `review_unit` calls and how it responds to correction instructions). We'll use that data to decide what needs to change before building the real system.