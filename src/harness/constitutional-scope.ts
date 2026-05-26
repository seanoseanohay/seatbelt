import type { RuleGroup, RuleScope } from '../types/index.js';
import type { SeatbeltConfig } from '../config.js';
import { CombinedRuleScope } from './rule-scope.js';

/**
 * ConstitutionalScope — single owner of the currently active constitutional rules.
 *
 * This is the state machine / authoritative source for "which rule groups are in effect right now".
 *
 * Responsibilities (current + prepared seams):
 * - Holds the global rules loaded from .seatbelt/config.json
 * - Can enter/exit narrow "repair scopes" (targeted repair passes)
 * - Answers isActive(group) for Auditor + prompt generation
 * - Future: can be driven by UI/menu, dynamic config reload, per-phase profiles, etc.
 *
 * Current implementation is a thin, disciplined wrapper around the existing
 * CombinedRuleScope logic. The goal is to eliminate the scattered "repairScope"
 * strings and multiple CombinedRuleScope constructions throughout the codebase.
 *
 * Design principles:
 * - Small focused object (SRP)
 * - No side effects on construction
 * - Easy to replace later with a more sophisticated machine (e.g. stack of scopes,
 *   history, event emission) without changing callers.
 */
export class ConstitutionalScope implements RuleScope {
  private globalRules: Required<SeatbeltConfig>['rules'];
  private activeRepairScope: string[] | null = null;

  constructor(initialRules: Required<SeatbeltConfig>['rules']) {
    this.globalRules = { ...initialRules };
  }

  /**
   * Replace the global (config-driven) rules.
   * Used when .seatbelt/config.json is (re)loaded.
   */
  setGlobalRules(rules: Required<SeatbeltConfig>['rules']): void {
    this.globalRules = { ...rules };
  }

  /**
   * Enter a narrow targeted repair pass for only the given groups.
   * This is the primary mechanism used by startRepairForRules.
   */
  enterRepairFor(ruleGroups: string[]): void {
    this.activeRepairScope = ruleGroups.length > 0 ? [...ruleGroups] : null;
  }

  /**
   * Exit any active repair scope (return to global rules).
   */
  exitRepair(): void {
    this.activeRepairScope = null;
  }

  /**
   * The core query used by Auditor and prompt generation.
   */
  isActive(group: RuleGroup): boolean {
    if (this.activeRepairScope && this.activeRepairScope.length > 0) {
      return this.activeRepairScope.includes(group);
    }
    return this.globalRules[group] !== false;
  }

  /**
   * Returns the list of groups that are currently active.
   * Useful for prompt generation and observability.
   */
  getActiveGroups(): RuleGroup[] {
    const all: RuleGroup[] = ['smallFocusedChanges', 'avoidGodFiles', 'highRiskAccretion'];

    if (this.activeRepairScope && this.activeRepairScope.length > 0) {
      return all.filter(g => this.activeRepairScope!.includes(g)) as RuleGroup[];
    }

    return all.filter(g => this.globalRules[g] !== false);
  }

  /**
   * Returns whether we are currently in a narrow repair scope.
   */
  isInRepairScope(): boolean {
    return this.activeRepairScope !== null && this.activeRepairScope.length > 0;
  }

  /**
   * For migration / testing: returns a RuleScope view that can be passed to
   * existing CombinedRuleScope consumers during the transition.
   */
  asRuleScope(): RuleScope {
    return this;
  }

  /**
   * Debug / status helper.
   */
  getStateForDebug() {
    return {
      globalRules: { ...this.globalRules },
      activeRepairScope: this.activeRepairScope ? [...this.activeRepairScope] : null,
      activeGroups: this.getActiveGroups(),
    };
  }
}

/**
 * Factory that creates a ConstitutionalScope from a loaded config.
 */
export function createConstitutionalScope(
  configRules: Required<SeatbeltConfig>['rules']
): ConstitutionalScope {
  return new ConstitutionalScope(configRules);
}
