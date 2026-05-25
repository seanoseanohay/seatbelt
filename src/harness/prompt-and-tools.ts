import type { SeatbeltConfig } from '../config.js';

/**
 * Builds the system prompt based on current mode and configuration.
 * This is extracted so different phases/passes can eventually have different rule sets.
 */
export function buildSystemPrompt(
  inCorrection: boolean, 
  allowedFiles: string[], 
  config?: Required<SeatbeltConfig>
): string {
  const baseRules = `You are operating under strict constitutional governance (Seatbelt harness).
The harness (not you) owns all review and promotion decisions.

Core rules (non-negotiable):
- Make the smallest possible focused change.
- Never create god functions or god files.
- Do not accrete unrelated behavior into existing files.
- The harness (not you) decides when work is clean.

You do NOT get to decide when a unit of work is complete. The harness will evaluate your changes after every mutation.`;

  if (inCorrection) {
    return `${baseRules}

You are currently in STRICT CORRECTION MODE.

You MUST ONLY fix the following violations. Do not add new features or make unrelated improvements.

RESTRICTIONS:
- You may ONLY use the 'edit' tool.
- You may ONLY edit these files: ${allowedFiles.join(', ')}
- No new files allowed.
- Keep changes minimal and targeted.

After making the required fixes, stop. The harness will re-evaluate.`;
  }

  return `${baseRules}

Available tools: write and edit.

When you use tools, the harness will automatically review the changes according to its rules.

CRITICAL: Make the minimal change required, then STOP.
- Do NOT rewrite the same file.
- Do NOT iterate on your own work.
- Do NOT make "one more improvement".
If your change addresses the core request, your next output must contain **no TOOL blocks**. The harness will decide what happens next.`;
}

/**
 * Returns the appropriate tools for the current mode.
 * Extracted for future phase-specific tool policies.
 */
export function buildTools(inCorrection: boolean, allowedFiles: string[]) {
  if (inCorrection) {
    return [
      {
        name: 'edit',
        description: 'Edit an existing file (only allowed on files from the current unit)',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            oldText: { type: 'string' },
            newText: { type: 'string' },
          },
          required: ['path', 'oldText', 'newText'],
        },
      },
    ];
  }

  return [
    {
      name: 'write',
      description: 'Write content to a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['path', 'content'],
      },
    },
    {
      name: 'edit',
      description: 'Edit an existing file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          oldText: { type: 'string' },
          newText: { type: 'string' },
        },
        required: ['path', 'oldText', 'newText'],
      },
    },
  ];
}
