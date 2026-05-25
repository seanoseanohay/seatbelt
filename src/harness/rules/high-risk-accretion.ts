import type { ReviewContext, Violation } from '../../types/index.js';

/**
 * Runs checks related to the "highRiskAccretion" rule group.
 *
 * Triggered when the Controller detects touches to high-risk files
 * (patterns like "service", "core", "manager", "util", etc.) without
 * accompanying extraction of focused modules.
 *
 * This module follows the standard rule-group extraction pattern:
 * - Pure function, no side effects
 * - Returns Violation[] for the Auditor to collect under shouldEnforce guard
 * - Imported via the rules barrel (the obvious extension point)
 */
export function checkHighRiskAccretion(
  context: ReviewContext
): Violation[] {
  const violations: Violation[] = [];

  if (context.touchedHighRiskFiles.length > 0) {
    violations.push({
      ruleId: 'high-risk-accretion',
      message: `Accretion risk: touched high-risk file(s) ${context.touchedHighRiskFiles.join(', ')} without extracting focused modules.`,
      severity: 'high',
    });
  }

  return violations;
}
