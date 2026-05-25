import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

/**
 * Worktree manager — provides an isolated directory for the agent to work in.
 * Reused and refined from Spike 003 patterns.
 */
export class Worktree {
  constructor(public readonly path: string) {}

  async ensure(): Promise<void> {
    if (!existsSync(this.path)) {
      await mkdir(this.path, { recursive: true });
    }

    // Make it a git repo so Codex is happy ("trusted directory")
    if (!existsSync(path.join(this.path, '.git'))) {
      spawnSync('git', ['init', '-q'], { cwd: this.path, stdio: 'ignore' });
      spawnSync('git', ['commit', '--allow-empty', '-m', 'initial'], {
        cwd: this.path,
        stdio: 'ignore',
      });
    }
  }

  resolve(relativePath: string): string {
    return path.join(this.path, relativePath);
  }

  async readFile(relativePath: string): Promise<string> {
    const { readFile } = await import('fs/promises');
    return readFile(this.resolve(relativePath), 'utf-8');
  }

  async writeFile(relativePath: string, content: string): Promise<void> {
    const { writeFile } = await import('fs/promises');
    const full = this.resolve(relativePath);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, content, 'utf-8');
  }
}