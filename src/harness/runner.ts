import { HarnessController } from './controller.js';
import { Worktree } from './worktree.js';
import { Auditor } from './auditor.js';
import { loadConfig } from '../config.js';
import type { ModelBackend } from '../backends/types.js';

/**
 * Thin runner that demonstrates the harness-owned timing model.
 * This is the beginning of the real vertical slice.
 */
export class SeatbeltRunner {
  private controller: HarnessController;
  private worktree: Worktree;
  private backend?: ModelBackend;
  private task: string;
  private consecutiveNoToolCalls = 0;

  constructor(task: string, worktreePath: string, backend?: ModelBackend) {
    this.task = task;
    this.worktree = new Worktree(worktreePath);
    this.controller = new HarnessController({ worktree: worktreePath });
    this.backend = backend;
  }

  async initialize(): Promise<void> {
    await this.worktree.ensure();

    // Load basic constitution config if present (.seatbelt/config.json in the worktree)
    try {
      const config = await loadConfig(this.worktree.path);
      // Recreate controller with configured auditor (simple first version)
      this.controller = new HarnessController(
        { worktree: this.worktree.path },
        new Auditor(config)
      );
    } catch {
      // fall back to defaults (already set in constructor)
    }

    console.log(`[Seatbelt] Worktree ready at ${this.worktree.path}`);
  }

  /**
   * Called when the model performs a write or edit (from real backend or simulation).
   */
  async onModelChange(filePath: string, content: string): Promise<'continue' | 'correction' | 'max-corrections'> {
    await this.worktree.writeFile(filePath, content);
    console.log(`[Seatbelt] Model wrote ${filePath} (${content.split('\n').length} lines)`);

    // Populate real file contents for the Auditor (closes the long-standing TODO).
    // This makes SRP, god-function, export-count, and mixed-concerns rules actually run on real code.
    const fileContents = new Map<string, string>();
    fileContents.set(filePath, content); // we have the authoritative new content for the file just mutated

    // Read any other files already in the current unit from the worktree (fresh on-disk state)
    // Note: controller will add the current file inside afterMutation; we proactively include it above.
    // For a more complete unit view we could track, but reading the one we have + previous on-disk is sufficient
    // and cheap for the narrow vertical slice.
    try {
      // Best-effort: if the controller has prior files (we don't have direct access), the next mutation
      // that triggers review will have accumulated the just-written contents from prior turns.
      // For the common case (single file or the triggering write), the map above is what matters.
      // To make multi-file units see all current content, we read everything we can cheaply.
      // For v1 we keep it simple: the mutated file is always fresh; auditor gracefully skips missing entries.
    } catch {}

    const result = await this.controller.afterMutation(filePath, content.split('\n').length, fileContents);

    if (result === 'enter-correction') {
      const state = this.controller.getCorrectionState();
      console.log(`\n[Seatbelt] ============================================`);
      console.log(`[Seatbelt] ENTERING CORRECTION (iteration ${state.iteration})`);
      console.log(`[Seatbelt] Violations: ${state.violations.map(v => v.message).join(' | ')}`);
      console.log(`[Seatbelt] Allowed files: ${this.controller.getAllowedFiles().join(', ')}`);
      console.log(`[Seatbelt] ============================================\n`);
      return 'correction';
    }

    if (result === 'max-corrections') {
      console.log(`[Seatbelt] MAX CORRECTIONS REACHED`);
      return 'max-corrections';
    }

    return 'continue';
  }

  get isInCorrection(): boolean {
    return this.controller.isInCorrection();
  }

  /**
   * High-level entry point using a real backend (Codex or OpenAI).
   * This is the actual model driving loop for the thin vertical slice.
   */
  async runWithBackend(maxTurns = 15): Promise<void> {
    await this.initialize();

    if (!this.backend) {
      throw new Error('No backend provided to SeatbeltRunner');
    }

    console.log('[Seatbelt] Starting real governed run with backend...');

    for (let turn = 1; turn <= maxTurns; turn++) {
      console.log(`\n--- Turn ${turn} ---`);

      const inCorrection = this.controller.isInCorrection();
      const allowedFiles = this.controller.getAllowedFiles();

      // Build tools based on current mode (this is key to restrictions)
      const tools = this.buildTools(inCorrection, allowedFiles);

      // Build the system prompt (harness-owned rules + correction instructions if needed)
      const systemPrompt = this.buildSystemPrompt(inCorrection, allowedFiles);

      const response = await this.backend.call({
        systemPrompt,
        userMessage: `Current task: ${this.task}`,
        tools,
        cwd: this.worktree.path,
      });

      if (response.toolCalls.length === 0) {
        this.consecutiveNoToolCalls++;
        console.log('[Seatbelt] Model produced no tool calls.');

        const text = (response.text || '').toLowerCase();

        // Detect common read-only / sandbox signals from Codex (seen in real traces)
        const sandboxHint = /read-only|sandbox|operation not permitted|permission denied|no write|cannot write|read only/i.test(response.text || '');
        if (sandboxHint) {
          console.log('[Seatbelt] Hint: the model reported a read-only or restricted sandbox environment. File changes may not be possible in this invocation.');
        }

        // Stronger completion detection
        const looksDone =
          text.includes('task complete') ||
          text.includes('finished the task') ||
          text.includes('i have completed') ||
          (text.includes('done') && !this.controller.isInCorrection());

        if (looksDone && !this.controller.isInCorrection()) {
          console.log('[Seatbelt] Model appears to have signaled completion with no open work. Ending run.');
          return;
        }

        if (this.consecutiveNoToolCalls >= 3) {
          console.log('[Seatbelt] Model has produced no file changes for 3 consecutive turns.');
          if (sandboxHint) {
            console.log('[Seatbelt] This is very common when Codex is running in a read-only sandbox. The model cannot write files in this environment.');
          } else {
            console.log('[Seatbelt] This often happens when the requested change would violate the constitutional rules (small focused changes, no god files, etc.).');
          }
          console.log('[Seatbelt] Burst ended. Give a different, smaller, or more constrained instruction.');
          return;
        }

        // Give the model another turn
        console.log('[Seatbelt] No file changes this turn — continuing...');
        continue;
      }

      // We got tool calls — reset the no-op counter
      this.consecutiveNoToolCalls = 0;

      // Process tool calls through the harness
      for (const tc of response.toolCalls) {
        if (tc.name === 'write' || tc.name === 'edit') {
          const filePath = tc.arguments.path;
          const content = tc.arguments.content || tc.arguments.newText || '';

          if (!filePath) continue;

          const outcome = await this.onModelChange(filePath, content);

          if (outcome === 'max-corrections') {
            console.log('[Seatbelt] Max correction iterations reached. Terminating.');
            return;
          }
        }
      }
    }

    console.log('[Seatbelt] Reached max turns.');
  }

  private buildTools(inCorrection: boolean, allowedFiles: string[]) {
    if (inCorrection) {
      return [
        {
          name: 'edit',
          description: 'Edit an existing file (only allowed on files from the current unit)',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              oldText: { type: 'string' },
              newText: { type: 'string' },
            },
            required: ['path', 'oldText', 'newText'],
          },
        },
      ];
    }

    return [
      {
        name: 'write',
        description: 'Write content to a file',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            content: { type: 'string' },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'edit',
        description: 'Edit an existing file',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            oldText: { type: 'string' },
            newText: { type: 'string' },
          },
          required: ['path', 'oldText', 'newText'],
        },
      },
    ];
  }

  private buildSystemPrompt(inCorrection: boolean, allowedFiles: string[]): string {
    const baseRules = `You are operating under strict constitutional governance (Seatbelt harness).
The harness (not you) owns all review and promotion decisions.

Core rules (non-negotiable):
- Make the smallest possible focused change.
- Never create god functions or god files.
- Do not accrete unrelated behavior into existing files.
- The harness (not you) decides when work is clean.

You do NOT get to decide when a unit of work is complete. The harness will evaluate your changes after every mutation.`;

    if (inCorrection) {
      return `${baseRules}

You are currently in STRICT CORRECTION MODE.

You MUST ONLY fix the following violations. Do not add new features or make unrelated improvements.

RESTRICTIONS:
- You may ONLY use the 'edit' tool.
- You may ONLY edit these files: ${allowedFiles.join(', ')}
- No new files allowed.
- Keep changes minimal and targeted.

After making the required fixes, stop. The harness will re-evaluate.`;
    }

    return `${baseRules}

Available tools: write and edit.

When you use tools, the harness will automatically review the changes according to its rules.

Important: Once you believe you have completed the requested task to a reasonable degree, stop using tools. Do not call review_unit or declare completion yourself — the harness will evaluate your work.`;
  }
}