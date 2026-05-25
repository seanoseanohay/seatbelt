import { ReviewContext, Violation, ReviewResult, type RuleScope } from '../types/index.js';
import { CombinedRuleScope } from './rule-scope.js';
// All rule modules are imported via the barrel for consistency and discoverability.
import {
  checkAvoidGodFiles,
  checkSrpConcentration,
  checkSmallFocusedChanges,
  checkHighRiskAccretion,
} from './rules/index.js';

/**
 * Structural Auditor — core of constitutional enforcement.
 * Ported and refined from Spike 003 validation.
 */
import type { SeatbeltConfig } from '../config.js';

export class Auditor {
  private readonly HEURISTIC_MAX_LINES: number;
  private readonly HEURISTIC_MAX_FILES: number;
  private readonly HIGH_RISK_PATTERNS: string[];
  private ruleScope: RuleScope;

  constructor(
    config?: Required<SeatbeltConfig>,
    ruleScope?: RuleScope
  ) {
    const auditorConfig = config?.auditor;
    this.HEURISTIC_MAX_LINES = auditorConfig?.maxLinesPerChange ?? 60;
    this.HEURISTIC_MAX_FILES = auditorConfig?.maxFilesPerChange ?? 2;
    this.HIGH_RISK_PATTERNS = auditorConfig?.highRiskPatterns ?? ['service', 'index', 'main', 'app', 'core', 'manager', 'util'];

    // Use provided RuleScope, or create a temporary one from config during migration
    if (ruleScope) {
      this.ruleScope = ruleScope;
    } else {
      this.ruleScope = new CombinedRuleScope(
        config?.rules ?? { smallFocusedChanges: true, avoidGodFiles: true, highRiskAccretion: true }
      );
    }
  }

  /**
   * Updates the RuleScope used by this Auditor (used when entering a targeted repair pass).
   * This is the main hook for dynamic scope changes during a session.
   */
  setRuleScope(scope: RuleScope) {
    this.ruleScope = scope;
  }

  async review(context: ReviewContext): Promise<ReviewResult> {
    const violations: Violation[] = [];

    const shouldEnforce = (group: 'smallFocusedChanges' | 'avoidGodFiles' | 'highRiskAccretion') =>
      this.ruleScope.isActive(group);

    // Structural analysis on actual file content
    let totalBehavioralExports = 0;

    for (const file of context.filesChanged) {
      const content = context.fileContents.get(file);
      if (!content) continue;

      const exportMatches = content.match(/export\s+(function|const|let|var|async function)\s+\w+/g) || [];
      const typeOnlyExports = content.match(/export\s+(type|interface)\s+\w+/g) || [];

      const behavioral = exportMatches.length;
      totalBehavioralExports += behavioral;

      const hasTypes = typeOnlyExports.length > 0;
      const hasBehavior = behavioral >= 2;

      // Avoid god files / SRP checks - delegated to module
      if (shouldEnforce('avoidGodFiles')) {
        violations.push(...checkAvoidGodFiles(context, content, file, totalBehavioralExports));
      }
    }

    // === Rule module delegations (this is the extension point for new rule groups) ===
    // High-risk accretion
    if (shouldEnforce('highRiskAccretion')) {
      violations.push(...checkHighRiskAccretion(context));
    }

    // Cross-file SRP concentration
    if (shouldEnforce('avoidGodFiles')) {
      violations.push(...checkSrpConcentration(totalBehavioralExports, context.filesChanged.length));
    }

    // Volume / small-focused changes
    if (shouldEnforce('smallFocusedChanges')) {
      violations.push(...checkSmallFocusedChanges(
        context.linesChanged,
        context.filesChanged.length,
        this.HEURISTIC_MAX_LINES,
        this.HEURISTIC_MAX_FILES
      ));
    }

    return {
      violations,
      isClean: violations.length === 0,
    };
  }
}