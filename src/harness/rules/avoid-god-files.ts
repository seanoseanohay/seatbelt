import type { ReviewContext, Violation } from '../../types/index.js';

/**
 * Runs all checks related to the "avoidGodFiles" rule group on a single file.
 * Returns the list of violations found for this group.
 *
 * This is the pilot extraction toward a "one file per rule group" structure.
 */
export function checkAvoidGodFiles(
  context: ReviewContext,
  content: string,
  file: string,
  totalBehavioralExports: number
): Violation[] {
  const violations: Violation[] = [];

  const exportMatches = content.match(/export\s+(function|const|let|var|async function)\s+\w+/g) || [];
  const typeOnlyExports = content.match(/export\s+(type|interface)\s+\w+/g) || [];

  const behavioral = exportMatches.length;
  const hasTypes = typeOnlyExports.length > 0;
  const hasBehavior = behavioral >= 2;

  // Mixed concerns (SRP smell)
  if (hasTypes && hasBehavior && context.filesChanged.length === 1) {
    violations.push({
      ruleId: 'mixed-concerns-single-file',
      message: `Structural SRP violation: mixing types and behavior in a single file (${file}).`,
      severity: 'high',
    });
  }

  // God file
  if (behavioral >= 5) {
    violations.push({
      ruleId: 'god-file',
      message: `File ${file} exports ~${behavioral} behavioral items — high risk of mixing responsibilities (god file).`,
      severity: 'high',
    });
  }

  // God function
  const longFuncMatches = content.match(/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]{300,}?^\s*\}/gm) || [];
  if (longFuncMatches.length > 0) {
    violations.push({
      ruleId: 'god-function',
      message: `File ${file} contains one or more very large function bodies — likely doing too many things.`,
      severity: 'high',
    });
  }

  // Single-file behavioral concentration (also under avoidGodFiles)
  if (context.filesChanged.length === 1 && totalBehavioralExports >= 3) {
    violations.push({
      ruleId: 'single-file-behavioral-bloat',
      message: `Structural SRP violation: ${totalBehavioralExports}+ exported behavioral items in a single file (${file}). Strongly prefer separating concerns.`,
      severity: 'high',
    });
  }

  return violations;
}

/**
 * Runs the cross-file SRP concentration check (also under avoidGodFiles).
 */
export function checkSrpConcentration(
  totalBehavioralExports: number,
  filesChangedCount: number
): Violation[] {
  const violations: Violation[] = [];

  if (totalBehavioralExports > 6 && filesChangedCount <= 2) {
    violations.push({
      ruleId: 'srp-concentration',
      message: `High SRP risk: ~${totalBehavioralExports} behavioral exports concentrated in only ${filesChangedCount} file(s).`,
      severity: 'medium',
    });
  }

  return violations;
}
