/**
 * Pluggable Implementer Backend
 * 
 * Supports:
 *   - "openai"   → Normal OpenAI API via pi-ai
 *   - "codex-cli" → Uses the local `codex` CLI (ChatGPT login)
 */

import { spawn } from 'child_process';

export type ImplementerBackend = 'openai' | 'codex-cli';

export interface ImplementerResponse {
  text: string;
  toolCalls: Array<{ name: string; arguments: any; id: string }>;
}

export async function callImplementer(
  backend: ImplementerBackend,
  prompt: string,
  tools: any[]
): Promise<ImplementerResponse> {

  if (backend === 'codex-cli') {
    return callCodexCLI(prompt, tools);
  }

  // Default: OpenAI via pi-ai
  return callOpenAI(prompt, tools);
}

async function callOpenAI(prompt: string, tools: any[]): Promise<ImplementerResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  // Dynamic import so we don't break codex-cli mode
  const { OpenAIProvider } = await import('@earendil-works/pi-ai/providers/openai');
  const { streamSimple } = await import('@earendil-works/pi-ai');

  const provider = new OpenAIProvider({ apiKey });

  const stream = await streamSimple(
    { provider: 'openai', id: 'gpt-4o' },
    {
      systemPrompt: '',
      messages: [{ role: 'user', content: prompt }],
      tools,
    },
    { apiKey }
  );

  let text = '';
  const toolCalls: any[] = [];

  for await (const event of stream) {
    if (event.type === 'text_delta') text += event.delta;
    if (event.type === 'toolcall_end') {
      toolCalls.push(event.toolCall);
    }
  }

  return { text, toolCalls };
}

async function callCodexCLI(prompt: string, tools: any[]): Promise<ImplementerResponse> {
  // Codex CLI doesn't have native structured tool calling like the OpenAI API.
  // We use strong prompting + best-effort parsing.
  const toolDescriptions = tools
    .map(t => `- ${t.name}: ${t.description || ''}\n  Arguments: ${JSON.stringify(t.parameters || {})}`)
    .join('\n');

  const fullPrompt = `
You are an agent running under constitutional governance (Seatbelt).

Available tools:
${toolDescriptions}

${prompt}

IMPORTANT INSTRUCTIONS FOR TOOL USE:
When you need to use a tool, output **exactly** in this format on its own lines (no extra text around it):

TOOL: tool_name
ARGS: {"path": "...", "content": "..."}

Use only the tool names listed above.
Do not escape arguments.
`;

  return new Promise((resolve, reject) => {
    // --skip-git-repo-check is required when running in temp/non-git directories
    // (which is the case for this validation spike)
    const child = spawn('codex', ['exec', '--skip-git-repo-check', fullPrompt], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    let stderrOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      stderrOutput += data.toString();
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`codex exec exited with code ${code}\n\nstderr:\n${stderrOutput}`));
      }

      // Best-effort parsing for Codex CLI output (validation spike only)
      const toolCalls: any[] = [];
      // Try to find the last TOOL: block in the output
      const toolMatch = output.match(/TOOL:\s*(\w+)\s*ARGS:\s*({[\s\S]*?})(?=\n|$)/gi);
      if (toolMatch && toolMatch.length > 0) {
        const last = toolMatch[toolMatch.length - 1];
        const parsed = last.match(/TOOL:\s*(\w+)\s*ARGS:\s*({[\s\S]*?})$/i);
        if (parsed) {
          try {
            toolCalls.push({
              name: parsed[1].trim(),
              arguments: JSON.parse(parsed[2].trim()),
              id: 'codex-' + Date.now(),
            });
          } catch (e) {
            console.error('[Codex Parser] Failed to parse tool args:', parsed[2]);
          }
        }
      }

      resolve({
        text: output,
        toolCalls,
      });
    });
  });
}
