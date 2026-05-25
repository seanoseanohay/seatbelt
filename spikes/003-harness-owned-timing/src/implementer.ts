/**
 * Pluggable Implementer Backend
 * 
 * Supports:
 *   - "openai"   → Normal OpenAI API via pi-ai
 *   - "codex-cli" → Uses the local `codex` CLI (ChatGPT login)
 * 
 * (Copied from spike 002 with no changes — parsing is intentionally minimal for validation speed.)
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
You are an agent running under strict constitutional governance (Seatbelt harness). The harness (not you) owns all review and promotion decisions.

Available tools:
${toolDescriptions}

${prompt}

CRITICAL TOOL OUTPUT RULES (follow exactly or the harness cannot see your actions):
- When you decide to use a tool, your *very last output* in the entire response must be exactly one TOOL block.
- Output nothing after the TOOL block — no explanations, no "done", no summary.
- Format must be exactly (no extra spaces or newlines around it):

TOOL: tool_name
ARGS: {"path": "...", "content": "..."}

- Use only the tool names listed above.
- Do not escape any arguments.
- If you need to do multiple things, do them in separate turns; the harness will process one tool call per response for now.
`;

  return new Promise((resolve, reject) => {
    // --skip-git-repo-check is required when running in temp/non-git directories
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

      // Improved parser for Codex CLI (Spike 003):
      // - Extract *all* TOOL: blocks in the order they appear (Codex can be very verbose).
      // - Parse each one; return every successfully parsed call so the harness can react after each mutation.
      const toolCalls: any[] = [];
      // Find every occurrence of a TOOL: ... ARGS: { ... } block.
      // We use a non-greedy but robust approach: look for TOOL: name followed by ARGS: then a JSON object.
      const toolRegex = /TOOL:\s*(\w+)\s*\n?\s*ARGS:\s*(\{[\s\S]*?\})(?=\s*(?:\n|TOOL:|$))/gi;
      let match;
      while ((match = toolRegex.exec(output)) !== null) {
        const name = match[1].trim();
        let jsonText = match[2].trim();

        // Best-effort cleanup: some Codex outputs have trailing text or markdown after the JSON.
        // Try to trim to the last closing brace of a top-level object.
        const lastBrace = jsonText.lastIndexOf('}');
        if (lastBrace > 0) {
          jsonText = jsonText.substring(0, lastBrace + 1);
        }

        try {
          const args = JSON.parse(jsonText);
          toolCalls.push({
            name,
            arguments: args,
            id: 'codex-' + Date.now() + '-' + toolCalls.length,
          });
        } catch (e) {
          console.error('[Codex Parser] Failed to parse ARGS JSON for tool', name, ':', jsonText.slice(0, 200));
        }
      }

      if (toolCalls.length > 0) {
        console.log(`[Codex Parser] Extracted ${toolCalls.length} tool call(s) from Codex output.`);
      } else {
        // Fallback: try the old single last-block logic in case the new regex missed something
        const fallbackMatch = output.match(/TOOL:\s*(\w+)\s*ARGS:\s*({[\s\S]*?})(?=\n|$)/i);
        if (fallbackMatch) {
          try {
            toolCalls.push({
              name: fallbackMatch[1].trim(),
              arguments: JSON.parse(fallbackMatch[2].trim()),
              id: 'codex-fallback-' + Date.now(),
            });
            console.log('[Codex Parser] Fallback parser recovered 1 tool call.');
          } catch {}
        }
      }

      resolve({
        text: output,
        toolCalls,
      });
    });
  });
}
