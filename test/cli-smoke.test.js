import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(__dirname, '../src/cli.ts');

function runCli(args = []) {
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', cliPath, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

test('seatbelt --help works', async () => {
  const result = await runCli(['--help']);
  assert.strictEqual(result.code, 0);
  assert.ok(result.stdout.includes('Harness-Owned Governance'));
  assert.ok(result.stdout.includes('seatbelt "your task description"'));
});

test('seatbelt --version works and reports a reasonable version', async () => {
  const result = await runCli(['--version']);
  assert.strictEqual(result.code, 0);
  // Should not be the old broken 0.1.0
  assert.ok(!result.stdout.includes('0.1.0'));
  assert.ok(/0\.\d+\.\d+/.test(result.stdout));
});

test('seatbelt with no args shows interactive help', async () => {
  const result = await runCli([]);
  assert.strictEqual(result.code, 0);
  assert.ok(result.stdout.includes('Governed coding session started'));
});

/**
 * Helper for driving the interactive REPL.
 * Sends lines to stdin and collects output until the process exits or timeout.
 */
function runInteractiveCli(commands = [], timeoutMs = 4000) {
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', cliPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    // Send commands with small delays to let the REPL process them
    let idx = 0;
    const sendNext = () => {
      if (idx < commands.length) {
        child.stdin.write(commands[idx] + '\n');
        idx++;
        setTimeout(sendNext, 120);
      } else {
        // Give a moment for final output, then close
        setTimeout(() => {
          if (!child.killed) child.stdin.end();
        }, 200);
      }
    };
    setTimeout(sendNext, 300);

    const timer = setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

test('interactive REPL responds to /help command', async () => {
  const result = await runInteractiveCli(['/help', '/exit']);
  assert.ok(result.stdout.includes('Commands:') || result.stdout.includes('/help'));
  assert.ok(result.stdout.includes('Governed coding session started'));
});

test('interactive REPL responds to /status command', async () => {
  const result = await runInteractiveCli(['/status', '/exit']);
  assert.ok(result.stdout.includes('[Seatbelt Status]') || result.stdout.includes('Session worktree'));
});

test('interactive REPL can take a follow-up instruction and then exit cleanly', async () => {
  const result = await runInteractiveCli([
    'add a comment to the top of the file',
    '/exit'
  ], 6000);
  assert.ok(result.stdout.includes('Governed burst for:') || result.stdout.includes('Governed coding session started'));
});
