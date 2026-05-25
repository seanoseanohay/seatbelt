// Public entry point for the seatbelt package.
// Re-exports the main classes so "import ... from 'seatbelt'" works after build.

export { SeatbeltAgent } from './agent.js';
export { SeatbeltRunner } from './harness/runner.js';
export { HarnessController } from './harness/controller.js';
export { Auditor } from './harness/auditor.js';
export { Worktree } from './harness/worktree.js';
export { CodexCliBackend } from './backends/codex-cli.js';
export type { ModelBackend, ModelResponse, ToolCall } from './backends/types.js';
export type * from './types/index.js';