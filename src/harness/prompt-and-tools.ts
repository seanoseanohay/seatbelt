import type { SeatbeltConfig } from '../config.js';
import type { Violation, RuleScope } from '../types/index.js';

/**
 * Builds the system prompt based on current mode and configuration.
 * This is extracted so different phases/passes can eventually have different rule sets.
 */
export function buildSystemPrompt(
  inCorrection: boolean, 
  allowedFiles: string[], 
  config?: Required<SeatbeltConfig>,
  violations: Violation[] = [],
  repairScope?: string[],
  ruleScope?: RuleScope
): string {
  const strictness = config?.prompt?.strictness ?? 'default';
  const rules = config?.rules ?? { smallFocusedChanges: true, avoidGodFiles: true, highRiskAccretion: true };

  // These two principles are universal and always present
  const universalPrinciples = [
    'The harness (not you) owns all review and promotion decisions.',
    'The harness (not you) decides when work is clean. You do NOT get to decide when a unit of work is complete.',
  ];

  const additionalPrinciples: string[] = [];

  if (rules.smallFocusedChanges !== false) {
    additionalPrinciples.push(
      strictness === 'strict'
        ? 'Make the SMALLEST possible focused change. Err on the side of doing less.'
        : 'Make the smallest possible focused change.'
    );
  }

  if (rules.avoidGodFiles !== false) {
    additionalPrinciples.push(
      'Never create god functions or god files. If a file or function is already doing too much, do not add to it.'
    );
  }

  if (rules.highRiskAccretion !== false) {
    additionalPrinciples.push(
      'Do not accrete unrelated behavior into high-risk files or existing modules.'
    );
  }

  const allPrinciples = [...universalPrinciples, ...additionalPrinciples];

  const baseRules = `You are operating under strict constitutional governance (Seatbelt harness).
${allPrinciples.join('\n')}

Core rules (non-negotiable):
${allPrinciples.map(p => `- ${p}`).join('\n')}

When in doubt, make a smaller change than you think is necessary.`;

  if (inCorrection) {
    // Determine active rule groups for the TARGETED REPAIR CONTEXT section.
    // Preferred: the injected RuleScope (now backed by ConstitutionalScope in the runner).
    // Fallbacks kept temporarily for tests and older call sites.
    let activeRules: string[];
    if (ruleScope) {
      activeRules = ['smallFocusedChanges', 'avoidGodFiles', 'highRiskAccretion'].filter(g => 
        ruleScope.isActive(g as any)
      );
    } else if (repairScope && repairScope.length > 0) {
      activeRules = repairScope;
    } else {
      activeRules = config?.rules 
        ? Object.entries(config.rules)
            .filter(([, enabled]) => enabled !== false)
            .map(([name]) => name)
        : ['smallFocusedChanges', 'avoidGodFiles', 'highRiskAccretion'];
    }

    let ruleContext = '';
    if (activeRules.length > 0) {
      ruleContext = `\n\nTARGETED REPAIR CONTEXT:\nYou are performing a repair pass for the following active rule groups only:\n${activeRules.map(r => `- ${r}`).join('\n')}\n\nYou must ONLY address violations that belong to these groups.`;
    }

    let violationSection = '';
    if (violations.length > 0) {
      const violationList = violations
        .map((v, i) => `${i + 1}. [${v.ruleId}] ${v.message}`)
        .join('\n');
      violationSection = `\n\nSPECIFIC VIOLATIONS TO FIX (filtered to active rules):\n${violationList}`;
    }

    const fixInstruction = violations.length > 0 
      ? 'You MUST ONLY fix the violations listed above.'
      : 'You MUST ONLY fix the following violations.';

    return `${baseRules}

You are currently in STRICT CORRECTION MODE (targeted repair).${ruleContext}${violationSection}

${fixInstruction} Do not add new features or make unrelated improvements.

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
