# Seatbelt

**A voluntary but reliable constitutional layer for agentic coding.**

Seatbelt is a harness that lets you (and teams) do agentic programming with LLMs while maintaining strong, consistent adherence to clean coding principles — without the discipline constantly eroding over long sessions.

## Installation

The goal: type `seatbelt` anywhere and get the governed coding session.

**Website**: [https://seanoseanohay.github.io/seatbelt](https://seanoseanohay.github.io/seatbelt)

### Standard install (recommended for everyone)

```bash
npm install -g @seanoseanohay/seatbelt
```

This is the normal, supported way to install Seatbelt.

### For contributors / local development

If you have cloned the source repository:

```bash
cd path/to/seatbelt-repo
npm run build && npm install -g .
```

Or use the helper script:

```bash
./install.sh
```

After either method above, you can use the command from anywhere:

```bash
seatbelt                      # interactive governed session (default)
seatbelt "your task here"     # one-shot mode
seatbelt --help
seatbelt --version
seatbelt --worktree /other/path "task"
```

### Option 3: Publish to npm (for others / permanent)

```bash
# cd into the directory where you cloned the seatbelt repository
cd path/to/seatbelt
npm publish
```

Then anyone can do:

```bash
npm install -g @seanoseanohay/seatbelt
```

The package is deliberately small (~16 kB) — only the compiled `dist/` + docs are published.

**Requirements**
- Node ≥ 18
- `codex` CLI in PATH (your Codex Pro subscription)

**Uninstall**
```bash
npm uninstall -g seatbelt
```

## The Core Idea

Most AI coding agents start out following good rules when you give them a strong AGENTS.md or constitution. Over time — especially across long sessions and with mixed-experience teams — they drift. You get monolithic commits, functions that do too many things, duplication, mixed concerns, and "while I'm here" changes.

Skills and prompts eventually get bypassed or forgotten. The result is a slow slide into a slop pit.

Seatbelt treats good engineering discipline like a **seatbelt**:

- You can still drive without it (easy bypass).
- Once you put it on, it actually protects you.
- The goal is to make using it the default, low-friction choice for daily work.

## Current Status

Thin vertical slice + interactive session UX is complete and runnable:

- `npx tsx src/cli.ts` (or `npm run seatbelt`, or globally linked `seatbelt`) opens the default governed coding session.
- Stable session dir by default: `~/.seatbelt/sessions/default` (resumes across invocations). Use `--worktree /path` for per-project.
- Full harness-owned timing, Auditor with real file content population (SRP/god-function/export rules now execute), automatic restricted correction.
- Cwd isolation for Codex CLI proven working (model's workspace = the seatbelt worktree).
- `npm run build` is clean → reliable `dist/` for the bin.
- One-shot still supported.

**Important Codex CLI note** (observed in real traces): The `codex exec` binary often runs in a read-only sandbox in some environments. The model will correctly detect this and refuse writes. In normal local usage the tools usually allow writes; the harness still enforces rules on every mutation that does occur.

See DECISIONS.md for the full milestone record.

## Goals (High Level)

- Make high-quality, small, orthogonal changes the path of least resistance when using agents.
- Significantly reduce the amount of structural feedback senior engineers have to give on agent-generated work.
- Support both experienced SDEs and people with little traditional engineering background.
- Work as a daily driver ("I put my seatbelt on every time I get in the car").
- Remain voluntary at the system level while being strict once activated.

## Key Documents

| Document | Purpose |
|----------|---------|
| [VISION.md](./VISION.md) | What success looks like |
| [PROBLEM.md](./PROBLEM.md) | The specific decay patterns we're fighting |
| [PHILOSOPHY.md](./PHILOSOPHY.md) | Seatbelt model, values, and constraints |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Current architectural thinking |
| [CONSTITUTION.md](./CONSTITUTION.md) | The principles we intend to enforce (v1 focus) |
| [ROADMAP.md](./ROADMAP.md) | Phased plan and current priorities |
| [DECISIONS.md](./DECISIONS.md) | Living record of key decisions |
| [docs/narrow-vertical-slice-design.md](./docs/narrow-vertical-slice-design.md) | Current design for the first narrow implementation slice |

## Quick Context

- Primary target tools: API-driven use of Claude, OpenAI/Codex-class models, Kimi, etc.
- Base agent runtime under evaluation: Pi
- Enforcement style: Hard gate + automatic correction loops once inside a protected session
- Initial scope: Pragmatic Programmer + Clean Code fundamentals (SRP, small focused changes, DRY, orthogonality, boy scout rule, etc.)

---

This directory exists to keep the thinking, constraints, and decisions clear as the project evolves. Everything here should be treated as living documentation.