import { test } from 'node:test';
import assert from 'node:assert';
import { ConstitutionalScope, createConstitutionalScope } from '../../src/harness/constitutional-scope.js';
import { DEFAULT_CONFIG } from '../../src/config.js';

test('ConstitutionalScope - defaults to all rules active from config', () => {
  const scope = createConstitutionalScope(DEFAULT_CONFIG.rules);

  assert.strictEqual(scope.isActive('smallFocusedChanges'), true);
  assert.strictEqual(scope.isActive('avoidGodFiles'), true);
  assert.strictEqual(scope.isActive('highRiskAccretion'), true);
  assert.strictEqual(scope.isInRepairScope(), false);
  assert.deepStrictEqual(scope.getActiveGroups(), ['smallFocusedChanges', 'avoidGodFiles', 'highRiskAccretion']);
});

test('ConstitutionalScope - respects disabled global rule', () => {
  const scope = createConstitutionalScope({
    smallFocusedChanges: false,
    avoidGodFiles: true,
    highRiskAccretion: true,
  });

  assert.strictEqual(scope.isActive('smallFocusedChanges'), false);
  assert.strictEqual(scope.isActive('avoidGodFiles'), true);
  assert.deepStrictEqual(scope.getActiveGroups(), ['avoidGodFiles', 'highRiskAccretion']);
});

test('ConstitutionalScope - enterRepairFor narrows to only requested groups', () => {
  const scope = createConstitutionalScope(DEFAULT_CONFIG.rules);

  scope.enterRepairFor(['highRiskAccretion']);

  assert.strictEqual(scope.isActive('smallFocusedChanges'), false);
  assert.strictEqual(scope.isActive('avoidGodFiles'), false);
  assert.strictEqual(scope.isActive('highRiskAccretion'), true);
  assert.strictEqual(scope.isInRepairScope(), true);
  assert.deepStrictEqual(scope.getActiveGroups(), ['highRiskAccretion']);
});

test('ConstitutionalScope - exitRepair restores global rules', () => {
  const scope = createConstitutionalScope({
    smallFocusedChanges: true,
    avoidGodFiles: false,
    highRiskAccretion: true,
  });

  scope.enterRepairFor(['smallFocusedChanges']);
  assert.strictEqual(scope.isActive('avoidGodFiles'), false);

  scope.exitRepair();

  assert.strictEqual(scope.isActive('smallFocusedChanges'), true);
  assert.strictEqual(scope.isActive('avoidGodFiles'), false); // back to global
  assert.strictEqual(scope.isInRepairScope(), false);
});

test('ConstitutionalScope - setGlobalRules updates base rules while outside repair', () => {
  const scope = createConstitutionalScope(DEFAULT_CONFIG.rules);

  scope.setGlobalRules({
    smallFocusedChanges: false,
    avoidGodFiles: true,
    highRiskAccretion: false,
  });

  assert.strictEqual(scope.isActive('smallFocusedChanges'), false);
  assert.strictEqual(scope.isActive('highRiskAccretion'), false);
});

test('ConstitutionalScope - repair scope takes precedence even after setGlobalRules', () => {
  const scope = createConstitutionalScope(DEFAULT_CONFIG.rules);

  scope.setGlobalRules({ smallFocusedChanges: true, avoidGodFiles: true, highRiskAccretion: true });
  scope.enterRepairFor(['avoidGodFiles']);

  // Even if we change global, repair wins
  scope.setGlobalRules({ smallFocusedChanges: false, avoidGodFiles: false, highRiskAccretion: false });

  assert.strictEqual(scope.isActive('avoidGodFiles'), true);
  assert.strictEqual(scope.isActive('smallFocusedChanges'), false);
  assert.strictEqual(scope.isInRepairScope(), true);
});
