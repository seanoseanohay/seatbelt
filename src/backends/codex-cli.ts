import { spawn } from 'child_process';
import type { ModelBackend, ModelResponse, ToolCall } from './types.js';

/**
 * Backend that drives the actual `codex` CLI (your Codex Pro subscription).
 *
 * This is the realistic path given that you only have Codex access right now.
 * It re-uses the improved parsing approach from Spike 003, with Codex-specific tweaks.
 */
export class CodexCliBackend implements ModelBackend {
  async call(params: {
    systemPrompt: string;
    userMessage: string;
    tools: any[];
    cwd?: string;
  }): Promise<ModelResponse> {
    const toolDescriptions = params.tools
      .map(
        (t) =>
          `- ${t.name}: ${t.description || ''}\n  Arguments: ${JSON.stringify(
            t.parameters || {}
          )}`
      )
      .join('\n');

    const fullPrompt = `
${params.systemPrompt}

Available tools:
${toolDescriptions}

${params.userMessage}

CRITICAL INSTRUCTIONS FOR CODEX:
- The Seatbelt harness has ALREADY prepared the isolated worktree and given you the rules. DO NOT waste turns re-probing with rg, find, ls, git, cat on AGENTS.md, package.json, or directory structure. This adds massive noise the user sees.
- You are in a restricted tool environment. The ONLY actions that can modify files are the write/edit tools explicitly listed above. Your internal shell tools are frequently read-only here.
- Your *very last output* must be exactly one clean block with nothing after it:
TOOL: tool_name
ARGS: {"path": "...", "content": "..."}

- No reasoning, summaries, or extra text after the TOOL block.
- In normal mode you may use write or edit. In correction mode you are restricted to edit on only the listed files.
- The harness (not you) owns review and promotion. Make the smallest possible focused change that moves the task forward, then STOP calling tools.
`;

    return new Promise((resolve, reject) => {
      const spawnOptions: any = {
        stdio: ['ignore', 'pipe', 'pipe'],
      };
      if (params.cwd) {
        spawnOptions.cwd = params.cwd;
      }
      const child = spawn('codex', ['exec', '--skip-git-repo-check', fullPrompt], spawnOptions);

      let output = '';
      let stderrOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data); // stream live like we did in the spikes
      });

      child.stderr.on('data', (data) => {
        stderrOutput += data.toString();
        process.stderr.write(data);
      });

      child.on('close', (code) => {
        if (code !== 0) {
          return reject(
            new Error(`codex exec exited with code ${code}\n\nstderr:\n${stderrOutput}`)
          );
        }

        // Use the improved parser from Spike 003
        const toolCalls: ToolCall[] = [];
        const toolRegex =
          /TOOL:\s*(\w+)\s*\n?\s*ARGS:\s*(\{[\s\S]*?\})(?=\s*(?:\n|TOOL:|$))/gi;

        let match;
        while ((match = toolRegex.exec(output)) !== null) {
          const name = match[1].trim();
          let jsonText = match[2].trim();

          // Best-effort cleanup for trailing junk
          const lastBrace = jsonText.lastIndexOf('}');
          if (lastBrace > 0) {
            jsonText = jsonText.substring(0, lastBrace + 1);
          }

          try {
            const args = JSON.parse(jsonText);
            toolCalls.push({ name, arguments: args });
          } catch (e) {
            console.error('[CodexCliBackend] Failed to parse ARGS for', name);
          }
        }

        if (toolCalls.length > 0) {
          console.log(`[CodexCliBackend] Extracted ${toolCalls.length} tool call(s)`);
        }

        resolve({
          text: output,
          toolCalls,
        });
      });
    });
  }
}