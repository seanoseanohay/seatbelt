import { test } from 'node:test';
import assert from 'node:assert';
import { Worktree } from '../../src/harness/worktree.js';
import { mkdtemp, rm, readFile, writeFile } from 'fs/promises';
import path from 'path';
import os from 'os';

async function createTempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'seatbelt-worktree-test-'));
}

async function cleanup(dir: string) {
  await rm(dir, { recursive: true, force: true });
}

test('Worktree - ensure creates directory and git repo', async () => {
  const dir = await createTempDir();
  try {
    const wt = new Worktree(dir);
    await wt.ensure();

    // Directory should exist
    const stat = await import('fs/promises').then(m => m.stat(dir));
    assert.ok(stat.isDirectory());

    // .git should exist
    const gitStat = await import('fs/promises').then(m => m.stat(path.join(dir, '.git')));
    assert.ok(gitStat.isDirectory());
  } finally {
    await cleanup(dir);
  }
});

test('Worktree - writeFile and readFile roundtrip', async () => {
  const dir = await createTempDir();
  try {
    const wt = new Worktree(dir);
    await wt.ensure();

    await wt.writeFile('src/hello.ts', 'export const x = 42;');
    const content = await wt.readFile('src/hello.ts');

    assert.strictEqual(content, 'export const x = 42;');
  } finally {
    await cleanup(dir);
  }
});
