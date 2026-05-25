import { test } from 'node:test';
import assert from 'node:assert';
import { loadConfig, DEFAULT_CONFIG } from '../../src/config.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import path from 'path';
import os from 'os';

test('loadConfig returns defaults when no config file exists', async () => {
  const tempDir = await import('fs/promises').then(m => m.mkdtemp(path.join(os.tmpdir(), 'seatbelt-test-')));
  try {
    const config = await loadConfig(tempDir);
    assert.deepStrictEqual(config, DEFAULT_CONFIG);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('loadConfig loads custom auditor settings', async () => {
  const tempDir = await import('fs/promises').then(m => m.mkdtemp(path.join(os.tmpdir(), 'seatbelt-test-')));
  const configDir = path.join(tempDir, '.seatbelt');
  await mkdir(configDir, { recursive: true });
  await writeFile(path.join(configDir, 'config.json'), JSON.stringify({
    auditor: {
      maxLinesPerChange: 120,
      highRiskPatterns: ['repository', 'service']
    }
  }));

  try {
    const config = await loadConfig(tempDir);
    assert.strictEqual(config.auditor.maxLinesPerChange, 120);
    assert.deepStrictEqual(config.auditor.highRiskPatterns, ['repository', 'service']);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
