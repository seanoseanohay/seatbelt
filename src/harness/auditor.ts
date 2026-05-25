import { ReviewContext, Violation, ReviewResult } from '../types/index.js';

/**
 * Structural Auditor — core of constitutional enforcement.
 * Ported and refined from Spike 003 validation.
 */
import type { SeatbeltConfig } from '../config.js';

export class Auditor {
  private readonly HEURISTIC_MAX_LINES: number;
  private readonly HEURISTIC_MAX_FILES: number;
  private readonly HIGH_RISK_PATTERNS: string[];
  private readonly config?: Required<SeatbeltConfig>;

  constructor(config?: Required<SeatbeltConfig>) {
    this.config = config;
    const auditorConfig = config?.auditor;
    this.HEURISTIC_MAX_LINES = auditorConfig?.maxLinesPerChange ?? 60;
    this.HEURISTIC_MAX_FILES = auditorConfig?.maxFilesPerChange ?? 2;
    this.HIGH_RISK_PATTERNS = auditorConfig?.highRiskPatterns ?? ['service', 'index', 'main', 'app', 'core', 'manager', 'util'];
  }

  async review(context: ReviewContext): Promise<ReviewResult> {
    const violations: Violation[] = [];
    const rules = this.config?.rules ?? { smallFocusedChanges: true, avoidGodFiles: true, highRiskAccretion: true };

    const shouldEnforce = (group: keyof NonNullable<Required<SeatbeltConfig>['rules']>) =>
      rules[group] !== false;

    // Volume checks - gated by smallFocusedChanges
    if (rules.smallFocusedChanges !== false) {
      if (context.linesChanged > this.HEURISTIC_MAX_LINES) {
        violations.push({
          ruleId: 'volume-too-large',
          message: `Change is too large for one unit (${context.linesChanged} lines). Prefer small focused changes.`,
          severity: 'medium',
        });
      }

      if (context.filesChanged.length > this.HEURISTIC_MAX_FILES) {
        violations.push({
          ruleId: 'too-many-files',
          message: `Too many files changed (${context.filesChanged.length}) for a single logical unit.`,
          severity: 'medium',
        });
      }
    }

    // High-risk accretion - gated by highRiskAccretion
    if (rules.highRiskAccretion !== false && context.touchedHighRiskFiles.length > 0) {
      violations.push({
        ruleId: 'high-risk-accretion',
        message: `Accretion risk: touched high-risk file(s) ${context.touchedHighRiskFiles.join(', ')} without extracting focused modules.`,
        severity: 'high',
      });
    }

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

      // Mixed concerns is also an SRP/god-file smell → gated with avoidGodFiles
      if (shouldEnforce('avoidGodFiles') && hasTypes && hasBehavior && context.filesChanged.length === 1) {
        violations.push({
          ruleId: 'mixed-concerns-single-file',
          message: `Structural SRP violation: mixing types and behavior in a single file (${file}).`,
          severity: 'high',
        });
      }

      // God file / SRP checks - gated by avoidGodFiles
      if (shouldEnforce('avoidGodFiles')) {
        if (behavioral >= 5) {
          violations.push({
            ruleId: 'god-file',
            message: `File ${file} exports ~${behavioral} behavioral items — high risk of mixing responsibilities (god file).`,
            severity: 'high',
          });
        }

        // God-function heuristic (rough)
        const longFuncMatches = content.match(/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]{300,}?^\s*\}/gm) || [];
        if (longFuncMatches.length > 0) {
          violations.push({
            ruleId: 'god-function',
            message: `File ${file} contains one or more very large function bodies — likely doing too many things.`,
            severity: 'high',
          });
        }
      }
    }

    // Single-file behavioral concentration - also under avoidGodFiles
    if (shouldEnforce('avoidGodFiles') && context.filesChanged.length === 1 && totalBehavioralExports >= 3) {
      const onlyFile = context.filesChanged[0];
      violations.push({
        ruleId: 'single-file-behavioral-bloat',
        message: `Structural SRP violation: ${totalBehavioralExports}+ exported behavioral items in a single file (${onlyFile}). Strongly prefer separating concerns.`,
        severity: 'high',
      });
    }

    // Cross-file concentration - also under avoidGodFiles
    if (shouldEnforce('avoidGodFiles') && totalBehavioralExports > 6 && context.filesChanged.length <= 2) {
      violations.push({
        ruleId: 'srp-concentration',
        message: `High SRP risk: ~${totalBehavioralExports} behavioral exports concentrated in only ${context.filesChanged.length} file(s).`,
        severity: 'medium',
      });
    }

    return {
      violations,
      isClean: violations.length === 0,
    };
  }
}