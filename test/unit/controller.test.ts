import { test } from 'node:test';
import assert from 'node:assert';
import { HarnessController } from '../../src/harness/controller.js';
import { Auditor } from '../../src/harness/auditor.js';
import path from 'path';
import os from 'os';
import { mkdtemp, rm } from 'fs/promises';

async function createTempWorktree(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'seatbelt-ctrl-test-'));
  return dir;
}

async function cleanup(dir: string) {
  await rm(dir, { recursive: true, force: true });
}

test('Controller - does not force review below thresholds', async () => {
  const worktree = await createTempWorktree();
  try {
    const controller = new HarnessController({ worktree }, new Auditor());
    
    // One small mutation
    const result = await controller.afterMutation('small.ts', 10, new Map([['small.ts', 'export function x() {}']]));
    
    assert.strictEqual(result, 'continue');
    assert.strictEqual(controller.isInCorrection(), false);
  } finally {
    await cleanup(worktree);
  }
});

test('Controller - enters correction when thresholds crossed', async () => {
  const worktree = await createTempWorktree();
  try {
    const controller = new HarnessController(
      { worktree, forcedReviewAfterMutations: 1 },
      new Auditor()
    );

    // Force review on first mutation by using high line count
    const result = await controller.afterMutation('big.ts', 100, new Map([['big.ts', 'export function big() { /* lots */ }']]));

    assert.strictEqual(result, 'enter-correction');
    assert.strictEqual(controller.isInCorrection(), true);

    const state = controller.getCorrectionState();
    assert.ok(state.violations.length > 0);
    assert.ok(controller.getAllowedFiles().includes('big.ts'));
  } finally {
    await cleanup(worktree);
  }
});

test('Controller - max-corrections after repeated violations', async () => {
  const worktree = await createTempWorktree();
  try {
    const controller = new HarnessController(
      { worktree, forcedReviewAfterMutations: 1, maxCorrectionIterations: 2 },
      new Auditor()
    );

    // First mutation → enter correction
    await controller.afterMutation('bad.ts', 100, new Map([['bad.ts', 'function bad() {}']]));

    // Second mutation while in correction → still in correction
    const second = await controller.afterMutation('bad.ts', 100, new Map([['bad.ts', 'function bad() {}']]));
    assert.strictEqual(second, 'enter-correction');

    // Third → should hit max
    const third = await controller.afterMutation('bad.ts', 100, new Map([['bad.ts', 'function bad() {}']]));
    assert.strictEqual(third, 'max-corrections');
  } finally {
    await cleanup(worktree);
  }
});

test('Controller - resets after clean review', async () => {
  const worktree = await createTempWorktree();
  try {
    const controller = new HarnessController(
      { worktree, forcedReviewAfterMutations: 1 },
      new Auditor()
    );

    // Big change → correction
    await controller.afterMutation('big.ts', 100, new Map([['big.ts', '/* big */']]));

    // Small clean change (should force review because forcedReviewAfterMutations=1)
    const cleanResult = await controller.afterMutation('clean.ts', 5, new Map([['clean.ts', 'export function clean(){}']]));

    // After clean, it should have reset and returned continue (or enter-correction only if Auditor flags it)
    // In this case the second file is small and clean, so expect continue
    assert.strictEqual(cleanResult, 'continue');
    assert.strictEqual(controller.isInCorrection(), false);
  } finally {
    await cleanup(worktree);
  }
});

test('Controller - high-risk file (service/core etc) triggers high-risk-accretion via controller context', async () => {
  const worktree = await createTempWorktree();
  try {
    const controller = new HarnessController(
      { worktree, forcedReviewAfterMutations: 1 },
      new Auditor()
    );

    // Mutate a high-risk named file (controller marks touchedHighRiskFiles for 'service')
    const result = await controller.afterMutation('userService.ts', 20, new Map([['userService.ts', 'export class UserService {}']]));

    assert.strictEqual(result, 'enter-correction');
    assert.strictEqual(controller.isInCorrection(), true);

    const state = controller.getCorrectionState();
    assert.ok(state.violations.some(v => v.ruleId === 'high-risk-accretion'));
    assert.ok(controller.getAllowedFiles().includes('userService.ts'));
  } finally {
    await cleanup(worktree);
  }
});

test('Controller - getStatus reports accurate mutations, files, and correction state', async () => {
  const worktree = await createTempWorktree();
  try {
    const controller = new HarnessController({ worktree }, new Auditor());

    const status1 = controller.getStatus();
    assert.strictEqual(status1.mutationsInUnit, 0);
    assert.deepStrictEqual(status1.filesInUnit, []);
    assert.strictEqual(status1.correction.active, false);

    await controller.afterMutation('a.ts', 5, new Map([['a.ts', 'export const a=1;']])); // below force (mutations<2, files=1, lines<80) so no review yet

    const status2 = controller.getStatus();
    assert.strictEqual(status2.mutationsInUnit, 1);
    assert.deepStrictEqual(status2.filesInUnit, ['a.ts']);
  } finally {
    await cleanup(worktree);
  }
});

test('Controller - getAllowedFiles is empty outside correction, populated on entry', async () => {
  const worktree = await createTempWorktree();
  try {
    const controller = new HarnessController(
      { worktree, forcedReviewAfterMutations: 1 },
      new Auditor()
    );

    assert.deepStrictEqual(controller.getAllowedFiles(), []);

    await controller.afterMutation('risky.ts', 100, new Map([['risky.ts', '/* big */']]));

    const allowed = controller.getAllowedFiles();
    assert.ok(allowed.includes('risky.ts'));
    assert.strictEqual(controller.isInCorrection(), true);
  } finally {
    await cleanup(worktree);
  }
});

test('Controller - clean review while in correction exits correction and clears violations/allowed', async () => {
  const worktree = await createTempWorktree();
  try {
    const controller = new HarnessController(
      { worktree, forcedReviewAfterMutations: 1 },
      new Auditor()
    );

    // Trigger correction with large change
    await controller.afterMutation('big.ts', 100, new Map([['big.ts', '/* big */']]));
    assert.strictEqual(controller.isInCorrection(), true);
    assert.ok(controller.getAllowedFiles().length > 0);

    // Now a clean small mutation (forced review) → should clean and exit correction
    const clean = await controller.afterMutation('tiny.ts', 3, new Map([['tiny.ts', 'export function t(){}']]));
    assert.strictEqual(clean, 'continue');
    assert.strictEqual(controller.isInCorrection(), false);
    assert.deepStrictEqual(controller.getAllowedFiles(), []);
    const state = controller.getCorrectionState();
    assert.strictEqual(state.violations.length, 0);
  } finally {
    await cleanup(worktree);
  }
});

test('Controller - unit state resets (mutations=0, files cleared) after entering correction', async () => {
  const worktree = await createTempWorktree();
  try {
    const controller = new HarnessController(
      { worktree, forcedReviewAfterMutations: 1 },
      new Auditor()
    );

    await controller.afterMutation('big.ts', 100, new Map([['big.ts', '/* big */']]));

    // After entering correction, internal unit counters are reset (per resetUnit call)
    const status = controller.getStatus();
    assert.strictEqual(status.mutationsInUnit, 0);
    assert.deepStrictEqual(status.filesInUnit, []);
    // but correction state still holds the allowedFiles from the unit that triggered
    assert.ok(status.correction.allowedFiles.includes('big.ts'));
  } finally {
    await cleanup(worktree);
  }
});
