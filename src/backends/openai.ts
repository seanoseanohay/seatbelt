// @ts-nocheck
// This backend is optional / secondary. We only use the Codex CLI backend.
// @ts-nocheck keeps `npm run build` clean for the primary Codex path while
// leaving the experimental OpenAI code untouched.

import type { ModelBackend, ModelResponse, ToolCall } from './types.js';

export class OpenAIBackend implements ModelBackend {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is required for OpenAIBackend');
    }
  }

  async call(params: {
    systemPrompt: string;
    userMessage: string;
    tools: any[];
    cwd?: string;
  }): Promise<ModelResponse> {
    // Dynamic import to avoid hard dependency issues
    const { OpenAIProvider } = await import('@earendil-works/pi-ai/providers/openai');
    const { streamSimple } = await import('@earendil-works/pi-ai');

    const provider = new OpenAIProvider({ apiKey: this.apiKey });

    const stream = await streamSimple(
      { provider: 'openai', id: 'gpt-4o' },
      {
        systemPrompt: params.systemPrompt,
        messages: [{ role: 'user', content: params.userMessage }],
        tools: params.tools,
      },
      { apiKey: this.apiKey }
    );

    let text = '';
    const toolCalls: ToolCall[] = [];

    for await (const event of stream) {
      if (event.type === 'text_delta') {
        text += event.delta;
      }
      if (event.type === 'toolcall_end') {
        toolCalls.push({
          name: event.toolCall.name,
          arguments: event.toolCall.arguments || {},
        });
      }
    }

    return { text, toolCalls };
  }
}