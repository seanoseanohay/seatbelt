import { HarnessController } from './controller.js';
import { Worktree } from './worktree.js';
import { Auditor } from './auditor.js';
import { loadConfig, DEFAULT_CONFIG, type SeatbeltConfig } from '../config.js';
import { ConstitutionalScope, createConstitutionalScope } from './constitutional-scope.js';
import { buildSystemPrompt, buildTools } from './prompt-and-tools.js';
import { ProgressTracker } from './progress-tracker.js';
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
  private progress = new ProgressTracker();
  private config: Required<SeatbeltConfig> = DEFAULT_CONFIG; // will be overwritten in initialize()

  /**
   * The single source of truth for which constitutional rule groups are currently active.
   * Owned here; passed (via asRuleScope()) to Auditor and prompt generation.
   */
  private constitutionalScope: ConstitutionalScope;

  /**
   * Desired narrow repair scope that should survive initialize() recreating the constitutionalScope.
   * Set by startRepairForRules / setRepairScope before or during a run.
   */
  private desiredRepairScope?: string[];

  constructor(task: string, worktreePath: string, backend?: ModelBackend) {
    this.task = task;
    this.worktree = new Worktree(worktreePath);
    this.controller = new HarnessController({ worktree: worktreePath });
    // Start with default all-rules scope; initialize() will replace with config-driven one.
    this.constitutionalScope = createConstitutionalScope(DEFAULT_CONFIG.rules);
    this.backend = backend;
  }

  async initialize(): Promise<void> {
    await this.worktree.ensure();

    // Load basic constitution config if present (.seatbelt/config.json in the worktree)
    try {
      this.config = await loadConfig(this.worktree.path);

      // Create (or replace) the single ConstitutionalScope from the loaded config.
      // This is now the authoritative owner of active rules.
      this.constitutionalScope = createConstitutionalScope(this.config.rules);

      // Re-apply any desired repair scope that was set before or across initialize
      // (e.g. startRepairForRules called before runWithBackend). This fixes the
      // lifecycle issue where the scope instance was replaced.
      if (this.desiredRepairScope && this.desiredRepairScope.length > 0) {
        this.constitutionalScope.enterRepairFor(this.desiredRepairScope);
      }

      const ruleScopeForAuditor = this.constitutionalScope.asRuleScope();

      this.controller = new HarnessController(
        { worktree: this.worktree.path },
        new Auditor(this.config, ruleScopeForAuditor)
      );
    } catch {
      // fall back to defaults
      this.config = DEFAULT_CONFIG;
      this.constitutionalScope = createConstitutionalScope(DEFAULT_CONFIG.rules);
    }

    console.log(`[Seatbelt] Worktree ready at ${this.worktree.path}`);
  }

  /**
   * Called when the model performs a write or edit (from real backend or simulation).
   */
  async onModelChange(filePath: string, content: string): Promise<'continue' | 'correction' | 'max-corrections'> {
    await this.worktree.writeFile(filePath, content);
    console.log(`[Seatbelt] Model wrote ${filePath} (${content.split('\n').length} lines)`);

    // Delegate repetition and progress tracking to the dedicated tracker
    this.progress.recordMutation(filePath, content);

    const fileContents = this.buildFileContentsForMutation(filePath, content);

    const result = await this.controller.afterMutation(filePath, content.split('\n').length, fileContents);

    if (result === 'enter-correction') {
      const state = this.controller.getCorrectionState();
      const activeGroups = this.constitutionalScope.getActiveGroups();

      console.log(`\n[Seatbelt] ╔════════════════════════════════════════════════════════════╗`);
      console.log(`[Seatbelt] ║  ENTERING CORRECTION (iteration ${state.iteration})`.padEnd(60) + '║');
      console.log(`[Seatbelt] ╠════════════════════════════════════════════════════════════╣`);

      if (activeGroups.length > 0) {
        console.log(`[Seatbelt] ║  Active rules: ${activeGroups.join(', ')}`.padEnd(60) + '║');
      }

      console.log(`[Seatbelt] ║  Violations detected:`);
      state.violations.slice(0, 4).forEach((v, i) => {
        let msg = `    ${i + 1}. [${v.ruleId}] ${v.message}`;
        if (msg.length > 56) msg = msg.substring(0, 53) + '...';
        console.log(`[Seatbelt] ║${msg.padEnd(58)}║`);
      });
      if (state.violations.length > 4) {
        console.log(`[Seatbelt] ║    ... and ${state.violations.length - 4} more`.padEnd(60) + '║');
      }

      const allowed = this.controller.getAllowedFiles().join(', ');
      console.log(`[Seatbelt] ║  Allowed files: ${allowed}`.padEnd(60) + '║');
      console.log(`[Seatbelt] ║                                                            ║`);
      console.log(`[Seatbelt] ║  The model is now restricted. Make only the minimal fixes  ║`);
      console.log(`[Seatbelt] ║  needed to resolve the violations above.                   ║`);
      console.log(`[Seatbelt] ╚════════════════════════════════════════════════════════════╝\n`);

      return 'correction';
    }

    if (result === 'max-corrections') {
      console.log(`\n[Seatbelt] ╔════════════════════════════════════════════════════════════╗`);
      console.log(`[Seatbelt] ║  MAX CORRECTIONS REACHED                                   ║`);
      console.log(`[Seatbelt] ║  The harness has exhausted its correction attempts.        ║`);
      console.log(`[Seatbelt] ║  The current unit of work could not be brought into        ║`);
      console.log(`[Seatbelt] ║  compliance with the active constitutional rules.          ║`);
      console.log(`[Seatbelt] ╚════════════════════════════════════════════════════════════╝\n`);
      return 'max-corrections';
    }

    return 'continue';
  }

  /**
   * Builds the minimal file contents map for Auditor review on this mutation.
   * Provides authoritative fresh content for the just-written file.
   * Controller supplements from disk for any other files in the current unit.
   *
   * Extracted from onModelChange for SRP (runner orchestrates; this helper owns the
   * population strategy) and to prepare seams for future richer strategies (e.g. full
   * unit file tracking across turns for multi-file changes under config-driven phases).
   */
  private buildFileContentsForMutation(filePath: string, content: string): Map<string, string> {
    const fileContents = new Map<string, string>();
    fileContents.set(filePath, content);
    // Note: no additional reads here currently (kept light). Controller performs best-effort
    // disk reads for prior filesInUnit. This can evolve without touching the mutation path.
    return fileContents;
  }

  get isInCorrection(): boolean {
    return this.controller.isInCorrection();
  }

  /**
   * Returns the currently active constitutional rule groups.
   * Backed by the ConstitutionalScope.
   */
  getActiveRuleGroups(): string[] {
    return this.constitutionalScope.getActiveGroups();
  }

  /**
   * Test / observability hook.
   * Returns the most recent correction state (including the list of violations)
   * from the last time the Auditor ran.
   */
  getLastCorrectionState() {
    return this.controller.getCorrectionState();
  }

  /**
   * Sets an explicit repair scope for the current session.
   * Used by higher-level APIs (e.g. SeatbeltAgent.startRepairForRules).
   *
   * This is the clean entry point for dynamic scope changes. It stores the intent on the
   * runner (so initialize can apply it even after controller recreation) and propagates
   * to the current controller/auditor if one exists.
   */
  setRepairScope(groups: string[]) {
    this.desiredRepairScope = groups && groups.length > 0 ? groups.slice() : undefined;

    if (this.desiredRepairScope) {
      this.constitutionalScope.enterRepairFor(this.desiredRepairScope);
    } else {
      this.constitutionalScope.exitRepair();
    }

    if (this.controller) {
      // Keep the controller's correction state in sync for now (legacy path)
      this.controller.setRepairScope(groups);
    }
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

      // Let the progress tracker know time has passed (for inactivity detection)
      this.progress.recordTimeAdvanced();

      const inCorrection = this.controller.isInCorrection();
      const allowedFiles = this.controller.getAllowedFiles();

      // Build tools based on current mode (this is key to restrictions)
      const tools = buildTools(inCorrection, allowedFiles);

      // Build the system prompt (harness-owned rules + correction instructions if needed)
      const state = inCorrection ? this.controller.getCorrectionState() : null;
      const currentViolations = state?.violations ?? [];

      // Use the single ConstitutionalScope as the source of truth for active rules
      // (both for the prompt and for Auditor enforcement).
      const effectiveRuleScope = this.constitutionalScope.asRuleScope();
      const activeRepairGroups = this.constitutionalScope.isInRepairScope()
        ? this.constitutionalScope.getActiveGroups().map(g => g as string)
        : undefined;

      const systemPrompt = buildSystemPrompt(
        inCorrection, 
        allowedFiles, 
        this.config, 
        currentViolations, 
        activeRepairGroups,
        effectiveRuleScope
      );

      const response = await this.backend.call({
        systemPrompt,
        userMessage: `Current task: ${this.task}`,
        tools,
        cwd: this.worktree.path,
      });

      if (response.toolCalls.length === 0) {
        this.progress.recordNoToolCall();
        console.log('[Seatbelt] Model produced no tool calls.');

        const text = (response.text || '').toLowerCase();

        // Detect common read-only / sandbox signals from Codex (seen in real traces)
        const sandboxHint = /read-only|sandbox|operation not permitted|permission denied|no write|cannot write|read only/i.test(response.text || '');
        if (sandboxHint) {
          console.log('[Seatbelt] Hint: the model reported a read-only or restricted sandbox environment. File changes may not be possible in this invocation.');
        }

        // Stronger completion detection (expanded for Codex-style language)
        const looksDone =
          text.includes('task complete') ||
          text.includes('finished the task') ||
          text.includes('i have completed') ||
          text.includes('i have finished') ||
          text.includes('no more changes') ||
          text.includes('the task is complete') ||
          text.includes('i am done') ||
          text.includes('work is complete') ||
          (text.includes('done') && !this.controller.isInCorrection());

        if (looksDone && !this.controller.isInCorrection()) {
          console.log('[Seatbelt] Model appears to have signaled completion with no open work. Ending run.');
          return;
        }

        if (this.progress.shouldExitDueToNoToolCalls()) {
          console.log('[Seatbelt] Model has produced no file changes for 3 consecutive turns.');
          if (sandboxHint) {
            console.log('[Seatbelt] This is very common when Codex is running in a read-only sandbox. The model cannot write files in this environment.');
          } else {
            console.log('[Seatbelt] This often happens when the requested change would violate the constitutional rules (small focused changes, no god files, etc.).');
          }
          console.log('[Seatbelt] Burst ended. Give a different, smaller, or more constrained instruction.');
          return;
        }

        // One-shot inactivity exit
        if (this.progress.shouldExitDueToInactivityAfterWork()) {
          console.log('[Seatbelt] One-shot mode: Model made changes but has been inactive for multiple turns. Considering task complete.');
          return;
        }

        // Give the model another turn
        console.log('[Seatbelt] No file changes this turn — continuing...');
        continue;
      }

      // We got tool calls — reset the no-op counter
      this.progress.recordToolCallsReceived();

      // One-shot safety net: if we've done a lot of mutations without hitting correction, the task is probably complete
      if (this.progress.shouldExitDueToTooManyMutationsWithoutCorrection() && !this.controller.isInCorrection()) {
        console.log('[Seatbelt] One-shot safety: Several mutations completed with no new violations detected. Ending run.');
        return;
      }

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

          // If the model is hammering the same file repeatedly in one-shot, cut it off early
          if (this.progress.shouldExitDueToRepeatedSameFile() && !this.controller.isInCorrection()) {
            console.log('[Seatbelt] One-shot safety: Model is repeatedly rewriting the same file with no progress. Stopping.');
            return;
          }
        }
      }
    }

    console.log('[Seatbelt] Reached max turns.');
  }

}