import type { Violation } from '../../types/index.js';

/**
 * Runs checks related to the "smallFocusedChanges" rule group.
 */
export function checkSmallFocusedChanges(
  linesChanged: number,
  filesChangedCount: number,
  maxLines: number,
  maxFiles: number
): Violation[] {
  const violations: Violation[] = [];

  if (linesChanged > maxLines) {
    violations.push({
      ruleId: 'volume-too-large',
      message: `Change is too large for one unit (${linesChanged} lines). Prefer small focused changes.`,
      severity: 'medium',
    });
  }

  if (filesChangedCount > maxFiles) {
    violations.push({
      ruleId: 'too-many-files',
      message: `Too many files changed (${filesChangedCount}) for a single logical unit.`,
      severity: 'medium',
    });
  }

  return violations;
}
