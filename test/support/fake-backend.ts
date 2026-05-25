import type { ModelBackend, ModelResponse, ToolCall } from '../../src/backends/types.js';

/**
 * FakeModelBackend — for deterministic integration tests of the governed loop.
 *
 * Philosophy (per project constitution + plan):
 * - Fake ONLY the ModelBackend boundary.
 * - Everything else (Worktree, git, Controller, Auditor, ProgressTracker, prompt builders,
 *   real FS writes, config loading) must be 100% real.
 *
 * Usage in a test:
 *   const backend = new FakeModelBackend([
 *     { toolCalls: [{ name: 'write', arguments: { path: 'foo.ts', content: '...' } }] },
 *     { text: 'Task complete. No more changes needed.' },   // triggers looksDone heuristic
 *   ]);
 *
 * Or use the function form for turn-aware logic:
 *   new FakeModelBackend((turn) => turn === 1 ? { toolCalls: [...] } : { text: 'done' });
 *
 * The fake never spawns real codex, never streams live output, and is fully synchronous
 * in its decision making (async only to match the interface).
 */
export class FakeModelBackend implements ModelBackend {
  private responses: Array<ModelResponse | ((turn: number, lastPrompt: string) => ModelResponse)>;
  private callCount = 0;
  /** Captured tools offered by the harness on each call (for asserting real tool restrictions in correction mode). */
  public toolsOffered: any[][] = [];
  /** Captured full system prompts sent by the harness (strong proof of correction instructions + allowed files). */
  public systemPrompts: string[] = [];

  constructor(
    responses:
      | Array<ModelResponse | ((turn: number, lastPrompt: string) => ModelResponse)>
      | ((turn: number, lastPrompt: string) => ModelResponse)
  ) {
    if (typeof responses === 'function') {
      this.responses = [responses];
    } else {
      this.responses = responses;
    }
  }

  async call(params: {
    systemPrompt: string;
    userMessage: string;
    tools: any[];
    cwd?: string;
  }): Promise<ModelResponse> {
    this.callCount += 1;
    const turn = this.callCount;
    this.toolsOffered.push(params.tools);
    this.systemPrompts.push(params.systemPrompt);

    // Combine the full prompt the runner actually sent (for simple contains checks if desired)
    const fullPrompt = `${params.systemPrompt}\n\n${params.userMessage}`;

    const spec = this.responses[Math.min(turn - 1, this.responses.length - 1)];

    let response: ModelResponse;
    if (typeof spec === 'function') {
      response = spec(turn, fullPrompt);
    } else {
      response = spec ?? { text: 'No more actions.', toolCalls: [] };
    }

    // Normalize: ensure toolCalls is always an array
    return {
      text: response.text,
      toolCalls: response.toolCalls ?? [],
    };
  }

  /** Convenience: reset call counter between tests if reusing the same instance. */
  reset() {
    this.callCount = 0;
  }

  getCallCount(): number {
    return this.callCount;
  }
}

/** Helper to make a single tool call response (write or edit). */
export function makeWriteToolCall(path: string, content: string): ModelResponse {
  return {
    toolCalls: [
      {
        name: 'write',
        arguments: { path, content },
      } as ToolCall,
    ],
  };
}

export function makeEditToolCall(path: string, oldText: string, newText: string): ModelResponse {
  return {
    toolCalls: [
      {
        name: 'edit',
        arguments: { path, oldText, newText },
      } as ToolCall,
    ],
  };
}

/** Common "I'm done" response that triggers the looksDone heuristics in runner. */
export const DONE_RESPONSE: ModelResponse = {
  text: 'Task complete. I have finished the requested changes with no more work needed.',
  toolCalls: [],
};
