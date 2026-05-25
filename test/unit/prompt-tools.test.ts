import { test } from 'node:test';
import assert from 'node:assert';
import { buildSystemPrompt, buildTools } from '../../src/harness/prompt-and-tools.js';
import { DEFAULT_CONFIG } from '../../src/config.js';
import { CombinedRuleScope } from '../../src/harness/rule-scope.js';

test('buildTools returns only edit tool in correction mode', () => {
  const tools = buildTools(true, ['foo.ts']);
  assert.strictEqual(tools.length, 1);
  assert.strictEqual(tools[0].name, 'edit');
  assert.ok(tools[0].description.includes('only allowed on files from the current unit'));
});

test('buildTools returns write + edit in normal mode', () => {
  const tools = buildTools(false, []);
  assert.strictEqual(tools.length, 2);
  assert.ok(tools.some(t => t.name === 'write'));
  assert.ok(tools.some(t => t.name === 'edit'));
});

test('buildSystemPrompt contains correction restrictions when inCorrection=true', () => {
  const prompt = buildSystemPrompt(true, ['src/foo.ts']);
  assert.ok(prompt.includes('STRICT CORRECTION MODE'));
  assert.ok(prompt.includes('You MUST ONLY fix the following violations'));
  assert.ok(prompt.includes('src/foo.ts'));
  assert.ok(prompt.includes('No new files allowed'));
});

test('buildSystemPrompt contains strong stop instructions in normal mode', () => {
  const prompt = buildSystemPrompt(false, []);
  assert.ok(prompt.includes('Make the minimal change required, then STOP'));
  assert.ok(prompt.includes('Do NOT rewrite the same file'));
  assert.ok(prompt.includes('no TOOL blocks'));
});

test('buildSystemPrompt always includes core constitutional rules', () => {
  const promptNormal = buildSystemPrompt(false, []);
  const promptCorrection = buildSystemPrompt(true, ['bar.ts']);

  assert.ok(promptNormal.includes('Never create god functions or god files'));
  assert.ok(promptCorrection.includes('Never create god functions or god files'));
  assert.ok(promptNormal.includes('The harness (not you) decides when work is clean'));
});

test('buildSystemPrompt accepts config parameter (future phase seam for rule groups)', () => {
  const prompt = buildSystemPrompt(false, [], DEFAULT_CONFIG);
  assert.ok(prompt.includes('Core rules (non-negotiable)'));
  assert.ok(prompt.length > 100);
});

test('buildSystemPrompt in correction includes exact allowed files list', () => {
  const allowed = ['src/a.ts', 'lib/b.ts'];
  const prompt = buildSystemPrompt(true, allowed);
  assert.ok(prompt.includes('src/a.ts, lib/b.ts'));
  assert.ok(prompt.includes('You may ONLY edit these files'));
});

test('buildSystemPrompt normal mode excludes all correction-specific language', () => {
  const prompt = buildSystemPrompt(false, []);
  assert.ok(!prompt.includes('STRICT CORRECTION MODE'));
  assert.ok(!prompt.includes('CORRECTION MODE'));
  assert.ok(!prompt.includes('RESTRICTIONS:'));
  assert.ok(!prompt.includes('No new files allowed'));
  assert.ok(!prompt.includes('fix the following violations'));
});

test('buildTools in correction with empty allowedFiles still restricts to only edit', () => {
  const tools = buildTools(true, []);
  assert.strictEqual(tools.length, 1);
  assert.strictEqual(tools[0].name, 'edit');
});

test('buildSystemPrompt correction with empty allowedFiles still emits restriction text', () => {
  const prompt = buildSystemPrompt(true, []);
  assert.ok(prompt.includes('You may ONLY edit these files: '));
  assert.ok(prompt.includes('No new files allowed'));
});

test('buildSystemPrompt uses stricter language when prompt.strictness is "strict"', () => {
  const strictConfig = {
    ...DEFAULT_CONFIG,
    prompt: { strictness: 'strict' as const },
  };

  const prompt = buildSystemPrompt(false, [], strictConfig);
  assert.ok(prompt.includes('Err on the side of doing less'));
  assert.ok(prompt.includes('If a file or function is already doing too much'));
});

test('buildSystemPrompt uses default language when strictness is not set or "default"', () => {
  const defaultPrompt = buildSystemPrompt(false, [], DEFAULT_CONFIG);
  assert.ok(!defaultPrompt.includes('Err on the side of doing less'));
});

test('buildSystemPrompt omits language for disabled rule groups', () => {
  const configWithSomeRulesDisabled = {
    ...DEFAULT_CONFIG,
    rules: {
      smallFocusedChanges: true,
      avoidGodFiles: false,
      highRiskAccretion: false,
    },
  };

  const prompt = buildSystemPrompt(false, [], configWithSomeRulesDisabled);

  assert.ok(prompt.includes('smallest possible focused change'));
  assert.ok(!prompt.includes('god functions or god files'));
  assert.ok(!prompt.includes('high-risk files'));
});

test('buildSystemPrompt in correction includes specific violation details when provided', () => {
  const violations = [
    { ruleId: 'god-file', message: 'This file has too many exports', severity: 'high' as const },
    { ruleId: 'volume-too-large', message: 'Change is 120 lines', severity: 'medium' as const },
  ];

  const prompt = buildSystemPrompt(true, ['bad.ts'], DEFAULT_CONFIG, violations);

  assert.ok(prompt.includes('SPECIFIC VIOLATIONS TO FIX'));
  assert.ok(prompt.includes('[god-file] This file has too many exports'));
  assert.ok(prompt.includes('[volume-too-large] Change is 120 lines'));
});

test('buildSystemPrompt in targeted repair includes active rule groups', () => {
  const configWithSubset = {
    ...DEFAULT_CONFIG,
    rules: {
      smallFocusedChanges: true,
      avoidGodFiles: false,
      highRiskAccretion: true,
    },
  };

  const prompt = buildSystemPrompt(true, ['foo.ts'], configWithSubset, []);

  assert.ok(prompt.includes('TARGETED REPAIR CONTEXT'));
  assert.ok(prompt.includes('smallFocusedChanges'));
  assert.ok(prompt.includes('highRiskAccretion'));
  assert.ok(!prompt.includes('avoidGodFiles'));
});

test('buildSystemPrompt prefers explicit repairScope over global config rules', () => {
  const config = {
    ...DEFAULT_CONFIG,
    rules: {
      smallFocusedChanges: true,
      avoidGodFiles: true,
      highRiskAccretion: true,
    },
  };

  // Explicit scope is narrower
  const prompt = buildSystemPrompt(true, ['foo.ts'], config, [], ['smallFocusedChanges']);

  assert.ok(prompt.includes('TARGETED REPAIR CONTEXT'));
  assert.ok(prompt.includes('smallFocusedChanges'));
  assert.ok(!prompt.includes('avoidGodFiles'));
  assert.ok(!prompt.includes('highRiskAccretion'));
});

test('buildSystemPrompt uses injected RuleScope for targeted repair framing', () => {
  const narrowScope = new CombinedRuleScope(
    { smallFocusedChanges: true, avoidGodFiles: true, highRiskAccretion: true },
    ['highRiskAccretion']
  );

  const prompt = buildSystemPrompt(true, ['service.ts'], DEFAULT_CONFIG, [], undefined, narrowScope);

  assert.ok(prompt.includes('TARGETED REPAIR CONTEXT'));
  assert.ok(prompt.includes('highRiskAccretion'));
  assert.ok(!prompt.includes('smallFocusedChanges'));
  assert.ok(!prompt.includes('avoidGodFiles'));
});
