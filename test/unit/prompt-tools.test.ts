import { test } from 'node:test';
import assert from 'node:assert';
import { buildSystemPrompt, buildTools } from '../../src/harness/prompt-and-tools.js';
import { DEFAULT_CONFIG } from '../../src/config.js';

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
