export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ModelResponse {
  text?: string;
  toolCalls: ToolCall[];
}

export interface ModelBackend {
  /**
   * Send a prompt + available tools to the model and get back text + tool calls.
   */
  call(params: {
    systemPrompt: string;
    userMessage: string;
    tools: any[];
    cwd?: string; // worktree isolation for backends that spawn processes (Codex CLI)
  }): Promise<ModelResponse>;
}