import { test } from 'node:test';
import assert from 'node:assert';
import { Auditor } from '../../src/harness/auditor.js';

test('Auditor - volume violation', async () => {
  const auditor = new Auditor();
  const context = {
    filesChanged: ['big.ts'],
    linesChanged: 100,
    touchedHighRiskFiles: [],
    fileContents: new Map(),
  };

  const result = await auditor.review(context);
  assert.strictEqual(result.isClean, false);
  assert.ok(result.violations.some(v => v.ruleId === 'volume-too-large'));
});

test('Auditor - clean small change', async () => {
  const auditor = new Auditor();
  const code = `export function small() {}`;
  const context = {
    filesChanged: ['small.ts'],
    linesChanged: 5,
    touchedHighRiskFiles: [],
    fileContents: new Map([['small.ts', code]]),
  };

  const result = await auditor.review(context);
  assert.strictEqual(result.isClean, true);
});

test('Auditor respects avoidGodFiles rule group', async () => {
  const godFileCode = `export const a = 1; export const b = 2; export const c = 3; export const d = 4; export const e = 5; export const f = 6;`;

  const context = {
    filesChanged: ['god.ts'],
    linesChanged: 10,
    touchedHighRiskFiles: [],
    fileContents: new Map([['god.ts', godFileCode]]),
  };

  // Default (all rules enabled) → should flag god-file
  const strictAuditor = new Auditor();
  const strictResult = await strictAuditor.review(context);
  assert.ok(strictResult.violations.some(v => v.ruleId === 'god-file'));

  // With avoidGodFiles disabled → should not flag god-file
  const lenientAuditor = new Auditor({
    auditor: {},
    prompt: { strictness: 'default' },
    rules: {
      smallFocusedChanges: true,
      avoidGodFiles: false,
      highRiskAccretion: true,
    },
  });
  const lenientResult = await lenientAuditor.review(context);
  assert.ok(!lenientResult.violations.some(v => v.ruleId === 'god-file'));
});

test('Auditor respects smallFocusedChanges rule group (volume)', async () => {
  const context = {
    filesChanged: ['big.ts'],
    linesChanged: 100,
    touchedHighRiskFiles: [],
    fileContents: new Map(),
  };

  // Enabled → volume violation
  const strict = new Auditor();
  const strictResult = await strict.review(context);
  assert.ok(strictResult.violations.some(v => v.ruleId === 'volume-too-large'));

  // Disabled → no volume violation
  const lenient = new Auditor({
    auditor: {},
    prompt: { strictness: 'default' },
    rules: { smallFocusedChanges: false, avoidGodFiles: true, highRiskAccretion: true },
  });
  const lenientResult = await lenient.review(context);
  assert.ok(!lenientResult.violations.some(v => v.ruleId === 'volume-too-large'));
});

test('Auditor respects highRiskAccretion rule group', async () => {
  const context = {
    filesChanged: ['MyService.ts'],
    linesChanged: 10,
    touchedHighRiskFiles: ['MyService.ts'],
    fileContents: new Map([['MyService.ts', 'export class MyService {}']]),
  };

  // Enabled (default) → high-risk violation
  const strict = new Auditor();
  const strictResult = await strict.review(context);
  assert.ok(strictResult.violations.some(v => v.ruleId === 'high-risk-accretion'));

  // Disabled → no high-risk violation
  const lenient = new Auditor({
    auditor: {},
    prompt: { strictness: 'default' },
    rules: { smallFocusedChanges: true, avoidGodFiles: true, highRiskAccretion: false },
  });
  const lenientResult = await lenient.review(context);
  assert.ok(!lenientResult.violations.some(v => v.ruleId === 'high-risk-accretion'));
});
