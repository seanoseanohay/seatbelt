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

test('Auditor - too many files violation', async () => {
  const auditor = new Auditor();
  const context = {
    filesChanged: ['a.ts', 'b.ts', 'c.ts'],
    linesChanged: 10,
    touchedHighRiskFiles: [],
    fileContents: new Map(),
  };

  const result = await auditor.review(context);
  assert.strictEqual(result.isClean, false);
  assert.ok(result.violations.some(v => v.ruleId === 'too-many-files'));
});

test('Auditor - high risk accretion', async () => {
  const auditor = new Auditor();
  const context = {
    filesChanged: ['userManager.ts'],
    linesChanged: 20,
    touchedHighRiskFiles: ['userManager.ts'],
    fileContents: new Map(),
  };

  const result = await auditor.review(context);
  assert.strictEqual(result.isClean, false);
  assert.ok(result.violations.some(v => v.ruleId === 'high-risk-accretion'));
});

test('Auditor - god file detection via exports', async () => {
  const auditor = new Auditor();
  const code = `
    export function a() {}
    export function b() {}
    export function c() {}
    export function d() {}
    export function e() {}
    export function f() {}
  `;
  const context = {
    filesChanged: ['big.ts'],
    linesChanged: 10,
    touchedHighRiskFiles: [],
    fileContents: new Map([['big.ts', code]]),
  };

  const result = await auditor.review(context);
  assert.ok(result.violations.some(v => v.ruleId === 'god-file'));
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