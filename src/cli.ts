#!/usr/bin/env node
import * as readline from 'readline';
import { tmpdir } from 'os';
import path from 'path';
import { readFile } from 'fs/promises';
import { SeatbeltAgent } from './agent.js';
import { CodexCliBackend } from './backends/codex-cli.js';

interface CliOptions {
  task: string;
  interactive: boolean;
  help: boolean;
  version: boolean;
  worktree?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  let worktree: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--worktree' || a === '-w') {
      worktree = args[i + 1];
      i++; // consume value
    }
  }

  const flags = new Set(args.filter(a => a.startsWith('-')));
  let taskArgs = args.filter(a => !a.startsWith('-'));

  // Critical fix: the --worktree *value* (a path) does not start with '-',
  // so it was leaking into the task string and polluting the prompt to the model.
  // Explicitly remove any known flag *values* from the positional task.
  if (worktree) {
    taskArgs = taskArgs.filter(a => a !== worktree);
  }

  const task = taskArgs.join(' ');

  return {
    task,
    interactive: flags.has('--interactive') || flags.has('-i'),
    help: flags.has('--help') || flags.has('-h'),
    version: flags.has('--version') || flags.has('-v'),
    worktree,
  };
}

async function getVersion(): Promise<string> {
  const candidates: string[] = [];

  try {
    // Primary: resolve relative to this source file (works after `tsc` build from dist/)
    const { fileURLToPath } = await import('url');
    const thisFile = fileURLToPath(import.meta.url);
    const fromModule = path.resolve(path.dirname(thisFile), '../../package.json');
    candidates.push(fromModule);
  } catch {}

  // Fallback for tsx/dev runs: resolve from process cwd (where the user invoked the command)
  candidates.push(path.resolve(process.cwd(), 'package.json'));

  for (const p of candidates) {
    try {
      const pkg = JSON.parse(await readFile(p, 'utf-8'));
      if (pkg.name === 'seatbelt' && pkg.version) {
        return pkg.version;
      }
      if (pkg.version) return pkg.version;
    } catch {}
  }

  return '0.1.0';
}

function printHelp(version: string) {
  console.log(`
Seatbelt v${version} — Harness-Owned Governance for Agentic Coding

Usage:
  seatbelt "your task description"          Run one governed coding burst
  seatbelt                                  Start interactive governed session (stable ~/.seatbelt/sessions/default)
  seatbelt --interactive                    Same as above
  seatbelt --worktree /path/to/project      Use (and create) a specific persistent worktree
  seatbelt -w /other/path "task"            One-shot with explicit worktree
  seatbelt --help                           Show this help
  seatbelt --version                        Show version

In an interactive session:
  Type any instruction or follow-up (e.g. "add a test file for the parser")
  The harness will review every mutation the model makes.
  Correction mode (restricted tools + narrow scope) activates automatically on violations.

Commands (inside session):
  /help         This help
  /status       Show current worktree and governance state
  /violations   Show last known violations (from logs during bursts)
  /exit         Leave the governed session

Core guarantees (once inside):
- Harness (not the model) owns review timing and promotion.
- No self-review escape hatch.
- Automatic bounded correction with real tool restrictions on violation.
- Small, focused, SRP-respecting changes are the path of least resistance.

This is the "seatbelt" experience: voluntary to start (just don't run the command),
but reliably protective the entire time you are using it.
`);
}

async function runOneShot(task: string, backend: CodexCliBackend, version: string, worktreeOverride?: string) {
  console.log(`Seatbelt v${version} — Governed Coding Session`);
  console.log('Harness owns review timing • No self-review • Auto correction with restrictions\n');
  console.log(`Task: ${task}\n`);
  if (worktreeOverride) {
    console.log(`Using explicit worktree: ${worktreeOverride}\n`);
  }
  console.log('Starting governed execution...\n');

  const agent = worktreeOverride
    ? new SeatbeltAgent(task, backend, worktreeOverride)
    : new SeatbeltAgent(task, backend);
  await agent.start();

  console.log('\n[Seatbelt] One-shot governed session complete.');
  console.log('Files (if any) are in the isolated worktree printed above.');
}

async function runInteractiveSession(backend: CodexCliBackend, version: string, worktreeOverride?: string) {
  const home = process.env.HOME || tmpdir();
  const stableDefault = path.join(home, '.seatbelt', 'sessions', 'default');
  const sessionWorktree = worktreeOverride || stableDefault;
  let lastInstruction = '';

  // Ensure the stable location exists (Worktree will handle .git init on first use)
  try {
    const { mkdir } = await import('fs/promises');
    await mkdir(sessionWorktree, { recursive: true });
  } catch {}

  const isStableDefault = !worktreeOverride && sessionWorktree === stableDefault;

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Seatbelt v${version} — Harness-Owned Governance             ║
╚══════════════════════════════════════════════════════════════╝

Governed coding session started (powered by your Codex subscription).

Rules enforced the entire time:
  • Harness (not model) owns when reviews happen and whether clean.
  • No voluntary self-review escape hatch.
  • Violations trigger automatic correction with restricted tools only.
  • Work happens in an isolated git worktree for safety.

${isStableDefault ? 'Stable session directory (resumes on future `seatbelt` runs):' : 'Worktree:'} ${sessionWorktree}
${isStableDefault ? '(Pass --worktree /path for a different persistent project.)' : ''}

Type instructions or follow-ups. Every write/edit the model makes
is intercepted and reviewed by the harness before the next turn.

Type /help for commands, /exit to leave.
`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'seatbelt> ',
    historySize: 50,
  });

  const updatePrompt = (inCorrection = false) => {
    rl.setPrompt(inCorrection ? '[correction]> ' : 'seatbelt> ');
  };

  rl.prompt();

  rl.on('line', async (rawLine: string) => {
    const line = rawLine.trim();

    if (!line) {
      rl.prompt();
      return;
    }

    if (line === '/exit' || line === '/quit') {
      console.log('\n[Seatbelt] Ending governed session. Worktree preserved at:');
      console.log(`  ${sessionWorktree}`);
      console.log('You can resume later or inspect the files directly.\n');
      rl.close();
      return;
    }

    if (line === '/help' || line === '/?') {
      console.log(`
Commands:
  /help         Show this
  /status       Current session worktree + last instruction
  /violations   Reminder: violations are printed live during bursts
  /exit         Leave the session (worktree stays on disk)

Just type a normal instruction to continue the governed work:
  "create src/parser.ts with a small clean implementation"
  "now add unit tests for it, but only in a new test/ file"
  "refactor the big function out into focused helpers"
`);
      rl.prompt();
      return;
    }

    if (line === '/status') {
      console.log(`
[Seatbelt Status]
  Session worktree : ${sessionWorktree}
  Last instruction : ${lastInstruction || '(none yet)'}
  Backend          : Codex CLI (your subscription)
  Governance       : active (harness-owned timing + correction)
  Note             : Detailed correction state is shown live in burst logs.
`);
      rl.prompt();
      return;
    }

    if (line === '/violations') {
      console.log(`
[Seatbelt] Violations (if any) are printed live when the harness
evaluates changes during a burst. Look for lines like:
  [Seatbelt] ENTERING CORRECTION (iteration X)
  Violations: volume-too-large | high-risk-accretion | ...

Use /status for session info. The next instruction you type
will be executed under the same governance rules.
`);
      rl.prompt();
      return;
    }

    // Treat as real instruction / follow-up
    lastInstruction = line;
    console.log(`\n[Seatbelt] Governed burst for: ${line}\n`);

    try {
      const agent = new SeatbeltAgent(line, backend, sessionWorktree);
      // quiet so we don't spam repeated banners inside the REPL
      await agent.start(12, { quiet: true });
    } catch (err: any) {
      console.error('[Seatbelt] Burst error:', err?.message || err);
    }

    console.log('\n[Seatbelt] Burst complete. Ready for next instruction.');
    console.log(`[Seatbelt] Session worktree: ${sessionWorktree}\n`);
    updatePrompt(false);
    rl.prompt();
  });

  rl.on('close', () => {
    console.log('[Seatbelt] Session closed.');
    process.exit(0);
  });

  // Graceful on ^C
  rl.on('SIGINT', () => {
    console.log('\n[Seatbelt] Interrupted. Session worktree preserved.');
    rl.close();
  });
}

async function main() {
  const opts = parseArgs(process.argv);
  const version = await getVersion();
  const backend = new CodexCliBackend();

  if (opts.help) {
    printHelp(version);
    return;
  }

  if (opts.version) {
    console.log(`Seatbelt v${version}`);
    return;
  }

  const forceInteractive = opts.interactive || !opts.task;

  if (!forceInteractive && opts.task) {
    await runOneShot(opts.task, backend, version, opts.worktree);
    return;
  }

  // Default experience: interactive governed coding session (stable dir by default)
  await runInteractiveSession(backend, version, opts.worktree);
}

main().catch((err) => {
  console.error('[Seatbelt] Fatal error:', err);
  process.exit(1);
});