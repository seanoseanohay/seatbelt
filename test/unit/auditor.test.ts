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
