import { test } from 'node:test';
import assert from 'node:assert';
import { ProgressTracker } from '../../src/harness/progress-tracker.js';

test('ProgressTracker - exits due to repeated same file writes', () => {
  const tracker = new ProgressTracker();

  tracker.recordMutation('foo.ts', 'version 1');
  tracker.recordMutation('foo.ts', 'version 2');
  tracker.recordMutation('foo.ts', 'version 3'); // third time on same file

  assert.strictEqual(tracker.shouldExitDueToRepeatedSameFile(), true);
});

test('ProgressTracker - does not falsely trigger on different files', () => {
  const tracker = new ProgressTracker();

  tracker.recordMutation('foo.ts', 'v1');
  tracker.recordMutation('bar.ts', 'v1');

  assert.strictEqual(tracker.shouldExitDueToRepeatedSameFile(), false);
});

test('ProgressTracker - inactivity exit after work', () => {
  const tracker = new ProgressTracker();

  tracker.recordMutation('foo.ts', 'initial');
  tracker.recordTimeAdvanced();
  tracker.recordTimeAdvanced();

  assert.strictEqual(tracker.shouldExitDueToInactivityAfterWork(), true);
});

test('ProgressTracker - too many mutations safety net', () => {
  const tracker = new ProgressTracker();

  for (let i = 0; i < 5; i++) {
    tracker.recordMutation(`file${i}.ts`, 'code');
  }

  assert.strictEqual(tracker.shouldExitDueToTooManyMutationsWithoutCorrection(), true);
});

test('ProgressTracker - resets properly', () => {
  const tracker = new ProgressTracker();

  tracker.recordMutation('foo.ts', 'v1');
  tracker.recordMutation('foo.ts', 'v2');
  tracker.reset();

  assert.strictEqual(tracker.shouldExitDueToRepeatedSameFile(), false);
  assert.strictEqual(tracker.getTotalMutations(), 0);
});
