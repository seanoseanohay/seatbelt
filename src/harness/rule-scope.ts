import type { RuleGroup, RuleScope } from '../types/index.js';
import type { SeatbeltConfig } from '../config.js';

/**
 * Combines the global rules from config with an optional explicit repairScope.
 *
 * - If repairScope is provided and non-empty, only groups in the repairScope are active.
 * - Otherwise, falls back to the global rules from config.
 *
 * This is the current "combined" implementation. Later it can be replaced
 * (or wrapped) by a proper ConstitutionalScope state machine.
 */
export class CombinedRuleScope implements RuleScope {
  constructor(
    private readonly globalRules: Required<SeatbeltConfig>['rules'],
    private readonly repairScope?: string[]
  ) {}

  isActive(group: RuleGroup): boolean {
    if (this.repairScope && this.repairScope.length > 0) {
      return this.repairScope.includes(group);
    }
    return this.globalRules[group] !== false;
  }
}

/**
 * A simple RuleScope that always returns true for every group.
 * Useful as a default or for tests that don't care about scoping.
 */
export class AllRulesActive implements RuleScope {
  isActive(_group: RuleGroup): boolean {
    return true;
  }
}
