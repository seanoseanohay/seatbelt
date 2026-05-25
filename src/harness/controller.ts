import { Auditor } from './auditor.js';
import { loadConfig } from '../config.js';
import { CombinedRuleScope } from './rule-scope.js';
import type { RuleScope } from '../types/index.js';
import {
  ReviewContext,
  Violation,
  CorrectionState,
  HarnessOptions,
} from '../types/index.js';

export class HarnessController {
  private auditor: Auditor;
  private options: Required<HarnessOptions>;

  private mutationsInUnit = 0;
  private filesInUnit = new Set<string>();
  private correction: CorrectionState;

  constructor(options: HarnessOptions, auditor?: Auditor) {
    this.options = {
      worktree: options.worktree,
      constitution: options.constitution ?? [],
      maxCorrectionIterations: options.maxCorrectionIterations ?? 3,
      forcedReviewAfterMutations: options.forcedReviewAfterMutations ?? 2,
    };

    this.auditor = auditor ?? new Auditor();

    this.correction = {
      active: false,
      iteration: 0,
      maxIterations: this.options.maxCorrectionIterations,
      violations: [],
      allowedFiles: new Set(),
    };
  }

  /**
   * Called after every write/edit.
   * This is the harness-owned decision point (core of Spike 003).
   */
  async afterMutation(filePath: string, approxLines: number, fileContents: Map<string, string> = new Map()): Promise<'continue' | 'enter-correction' | 'max-corrections'> {
    this.filesInUnit.add(filePath);
    this.mutationsInUnit += 1;

    const shouldForce =
      this.mutationsInUnit >= this.options.forcedReviewAfterMutations ||
      this.filesInUnit.size >= 2 ||
      approxLines > 80;  // quick demo heuristic for large single writes (Task C style)

    if (!shouldForce) {
      return 'continue';
    }

    // If already in correction, we still want to re-evaluate the Auditor on new mutations
    // so we can advance the correction iteration count or eventually hit max-corrections.
    // We skip only the initial "should we review" decision.

    const isHighRisk = this.filesInUnit.has(filePath) && 
      ['manager', 'core', 'service', 'util'].some(p => filePath.toLowerCase().includes(p));

    // Ensure we have real content for every file in the current unit (supplement what caller provided).
    // This makes god-function, export-count, mixed-concerns, and SRP rules actually execute.
    const contents = new Map(fileContents); // copy what runner gave us (includes the just-mutated file)
    for (const f of this.filesInUnit) {
      if (!contents.has(f)) {
        try {
          const { readFile } = await import('fs/promises');
          const full = (await import('path')).join(this.options.worktree, f);
          const txt = await readFile(full, 'utf-8');
          contents.set(f, txt);
        } catch {
          // best effort; auditor already skips missing entries
        }
      }
    }

    const context: ReviewContext = {
      filesChanged: Array.from(this.filesInUnit),
      linesChanged: approxLines,
      touchedHighRiskFiles: isHighRisk ? [filePath] : [],
      fileContents: contents,
    };

    const result = await this.auditor.review(context);

    if (result.isClean) {
      this.resetUnit();

      // If we were in correction and the current review is clean, exit correction.
      // This allows a repair pass to successfully finish its targeted fixes.
      if (this.correction.active) {
        this.correction.active = false;
        this.correction.violations = [];
        this.correction.allowedFiles = new Set();
        this.correction.iteration = 0;
      }

      return 'continue';
    }

    // Enter / advance correction
    if (!this.correction.active) {
      this.correction.active = true;
      this.correction.iteration = 1;
      this.correction.violations = result.violations;
      this.correction.allowedFiles = new Set(this.filesInUnit);
    } else {
      this.correction.iteration++;
      this.correction.violations = result.violations;
    }

    if (this.correction.iteration > this.correction.maxIterations) {
      return 'max-corrections';
    }

    this.resetUnit();
    return 'enter-correction';
  }

  getCorrectionState(): CorrectionState {
    return { ...this.correction };
  }

  isInCorrection(): boolean {
    return this.correction.active;
  }

  getAllowedFiles(): string[] {
    return Array.from(this.correction.allowedFiles);
  }

  getStatus() {
    return {
      mutationsInUnit: this.mutationsInUnit,
      filesInUnit: Array.from(this.filesInUnit),
      correction: { ...this.correction, allowedFiles: Array.from(this.correction.allowedFiles) },
    };
  }

  /**
   * Sets an explicit repair scope for the current (or next) correction pass.
   * When set, targeted repair prompts will be framed only around these rule groups.
   * This is the key hook for "second agent gets only these specific violations".
   */
  setRepairScope(groups: string[]) {
    this.correction.repairScope = groups;

    // Update the Auditor so enforcement stays consistent with the new targeted scope.
    // The Auditor exposes setRuleScope for exactly this dynamic repair-scope handoff.
    if (this.auditor) {
      // Narrow scope for the repair pass (only the groups explicitly requested).
      // Later, when we have a proper ConstitutionalScope state machine, this will
      // become: const newScope = this.constitutionalScope.getCurrentScope();
      const newScope: RuleScope = new CombinedRuleScope(
        { smallFocusedChanges: false, avoidGodFiles: false, highRiskAccretion: false },
        groups
      );
      this.auditor.setRuleScope(newScope);
    }
  }

  private resetUnit() {
    this.mutationsInUnit = 0;
    this.filesInUnit.clear();
  }
}