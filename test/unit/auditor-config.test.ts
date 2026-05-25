import { test } from 'node:test';
import assert from 'node:assert';
import { Auditor } from '../../src/harness/auditor.js';
import type { SeatbeltConfig } from '../../src/config.js';

test('Auditor respects custom max lines from config', async () => {
  const config: Required<SeatbeltConfig> = {
    auditor: {
      maxLinesPerChange: 30,
      maxFilesPerChange: 2,
      highRiskPatterns: ['service', 'manager'],
    },
  };

  const auditor = new Auditor(config);
  const context = {
    filesChanged: ['foo.ts'],
    linesChanged: 45,
    touchedHighRiskFiles: [],
    fileContents: new Map(),
  };

  const result = await auditor.review(context);
  assert.ok(result.violations.some(v => v.ruleId === 'volume-too-large'));
});

test('Auditor respects custom high risk patterns', async () => {
  const config: Required<SeatbeltConfig> = {
    auditor: {
      maxLinesPerChange: 100,
      maxFilesPerChange: 5,
      highRiskPatterns: ['repository'],
    },
  };

  const auditor = new Auditor(config);
  const context = {
    filesChanged: ['MyRepository.ts'],
    linesChanged: 10,
    touchedHighRiskFiles: ['MyRepository.ts'],
    fileContents: new Map(),
  };

  const result = await auditor.review(context);
  assert.ok(result.violations.some(v => v.ruleId === 'high-risk-accretion'));
});