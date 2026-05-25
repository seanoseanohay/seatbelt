import { test } from 'node:test';
import assert from 'node:assert';
import { Auditor } from '../../src/harness/auditor.js';

test('Auditor detects god-function via long body', async () => {
  const auditor = new Auditor();
  // Create a realistically long function body (>300 chars with newlines)
  const longBody = Array(20).fill('  console.log("line");').join('\n');
  const code = `function huge() {\n${longBody}\n}`;
  const context = {
    filesChanged: ['huge.ts'],
    linesChanged: 25,
    touchedHighRiskFiles: [],
    fileContents: new Map([['huge.ts', code]]),
  };

  const result = await auditor.review(context);
  assert.ok(result.violations.some(v => v.ruleId === 'god-function'));
});

test('Auditor detects mixed types and behavior in single file', async () => {
  const auditor = new Auditor();
  const code = `
    export interface User { id: number; }
    export function getUser() {}
    export const helper = () => {};
  `;
  const context = {
    filesChanged: ['mixed.ts'],
    linesChanged: 15,
    touchedHighRiskFiles: [],
    fileContents: new Map([['mixed.ts', code]]),
  };

  const result = await auditor.review(context);
  assert.ok(result.violations.some(v => v.ruleId === 'mixed-concerns-single-file'));
});

test('Auditor detects single-file behavioral bloat', async () => {
  const auditor = new Auditor();
  const code = `
    export function a() {}
    export function b() {}
    export function c() {}
    export function d() {}
  `;
  const context = {
    filesChanged: ['bloat.ts'],
    linesChanged: 10,
    touchedHighRiskFiles: [],
    fileContents: new Map([['bloat.ts', code]]),
  };

  const result = await auditor.review(context);
  assert.ok(result.violations.some(v => v.ruleId === 'single-file-behavioral-bloat'));
});
