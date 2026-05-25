import { SeatbeltRunner } from './harness/runner.js';
import type { ModelBackend } from './backends/types.js';
import path from 'path';
import { tmpdir } from 'os';

/**
 * SeatbeltAgent
 *
 * Higher-level interface for using Seatbelt as a governed coding agent.
 * 
 * Goal: You talk to the SeatbeltAgent (instead of raw Codex), and it enforces
 * the constitutional rules (harness owns review timing, no self-review escape,
 * automatic correction with restrictions).
 */
export class SeatbeltAgent {
  private runner: SeatbeltRunner;
  private task: string;
  private backend: ModelBackend;
  private sessionStarted = false;

  constructor(task: string, backend: ModelBackend, worktreePath?: string) {
    this.task = task;
    this.backend = backend;

    const effectiveWorktree = worktreePath || path.join(tmpdir(), `seatbelt-agent-${Date.now()}`);
    this.runner = new SeatbeltRunner(task, effectiveWorktree, backend);
  }

  /**
   * Open a governed coding session.
   * 
   * This is the main way to use Seatbelt as your coding agent.
   * It should feel similar to typing `codex`, `claude`, etc. to start a session —
   * except the constitutional rules are enforced the entire time
   * (harness owns review timing, no self-review escape hatch, automatic correction with real restrictions).
   */
  async start(maxTurns = 30, options: { quiet?: boolean } = {}): Promise<void> {
    if (this.sessionStarted) {
      console.log('[Seatbelt] Session already active.');
      return;
    }

    if (!options.quiet) {
      console.log('=== Seatbelt Session Opened ===');
      console.log('Governed coding agent (powered by your Codex subscription)');
      console.log('Rules enforced: Harness owns review timing • No self-review escape • Automatic correction with restrictions');
      console.log(`\nTask: ${this.task}\n`);
    }

    this.sessionStarted = true;

    await this.runner.runWithBackend(maxTurns);

    if (!options.quiet) {
      console.log('\n[Seatbelt] Session ended.');
      console.log('(Future versions will support resuming this exact session and continuing the conversation.)');
    }
  }

  /**
   * Future conversational API for ongoing work inside the same governed session.
   * Example usage in a more mature version:
   *   agent.sendMessage("also add unit tests for this");
   *   agent.sendMessage("now refactor the validation logic out");
   */
  async sendMessage(message: string): Promise<void> {
    console.log('[Seatbelt] sendMessage() is not yet implemented.');
    console.log('For now, start a new session with a follow-up task, or describe the continuation in the original task.');
  }

  isInCorrection(): boolean {
    return this.runner.isInCorrection;
  }
}