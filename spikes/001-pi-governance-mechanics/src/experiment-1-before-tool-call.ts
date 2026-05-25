/**
 * Spike Experiment 1: beforeToolCall Constitutional Enforcement (Isolated Version)
 *
 * This version is deliberately self-contained so we can run it immediately
 * and focus on the *logic* and effectiveness of constitutional rules at the
 * tool boundary.
 *
 * Real Pi integration notes are included as comments.
 */

console.log('=== Seatbelt × Pi Governance Spike ===');
console.log('Experiment 1: beforeToolCall for Structural Enforcement\n');

// ============================================
// Simulated beforeToolCall Context (matches Pi's shape)
// ============================================

type ToolCall = { name: string; id: string; arguments?: any };

interface BeforeToolCallContext {
  toolCall: ToolCall;
  args: any;
  context: any;
}

// ============================================
// Constitutional Rules (v0.1)
// ============================================

const rules = [
  {
    id: 'large-change-risk',
    check: (args: any) => {
      if (args.content) {
        const lines = args.content.split('\n').length;
        if (lines > 55) {
          return {
            block: true,
            reason: `Blocked: Writing ${lines} lines in one operation. This frequently produces low-cohesion functions. Split the change.`,
          };
        }
      }
      return null;
    },
  },
  {
    id: 'god-file-accretion',
    check: (args: any) => {
      const riskyFiles = ['userService', 'index.ts', 'app.ts', 'main.ts'];
      if (riskyFiles.some((f) => args.path?.includes(f))) {
        return {
          block: true,
          reason: `Blocked: ${args.path} is a high-risk file for continued growth. Create a new focused module with clear responsibility.`,
        };
      }
      return null;
    },
  },
];

// ============================================
// The Hook Implementation
// ============================================

function constitutionalBeforeToolCall({ toolCall, args }: BeforeToolCallContext) {
  console.log(`[beforeToolCall] ${toolCall.name} → ${args.path ?? 'n/a'}`);

  if (toolCall.name !== 'write' && toolCall.name !== 'edit') {
    return undefined;
  }

  for (const rule of rules) {
    const result = rule.check(args);
    if (result) {
      console.log(`  ❌ BLOCKED by "${rule.id}": ${result.reason}`);
      return { block: true, reason: result.reason };
    }
  }

  console.log(`  ✅ Passed constitutional preflight`);
  return undefined;
}

// ============================================
// Test Cases
// ============================================

const testCases = [
  {
    description: 'Large function into userService (should block on two rules)',
    toolCall: { name: 'write', id: 't1' },
    args: {
      path: 'src/userService.ts',
      content: Array(70).fill('// mixed logic').join('\n'),
    },
  },
  {
    description: 'Small focused function (should pass)',
    toolCall: { name: 'write', id: 't2' },
    args: {
      path: 'src/taxCalculator.ts',
      content: 'export function calculateTax(amount: number, rate: number) {\n  return amount * rate;\n}',
    },
  },
  {
    description: 'Edit to a risky file (should block on god-file rule)',
    toolCall: { name: 'edit', id: 't3' },
    args: {
      path: 'src/index.ts',
      edits: [{ oldText: 'old', newText: 'new' }],
    },
  },
];

console.log('--- Running constitutional preflight on simulated tool calls ---\n');

for (const test of testCases) {
  console.log(`Test: ${test.description}`);
  const result = constitutionalBeforeToolCall({
    toolCall: test.toolCall,
    args: test.args,
    context: {},
  });

  if (result?.block) {
    console.log(`→ Agent would receive error tool result and must react.\n`);
  } else {
    console.log(`→ Tool execution would proceed normally.\n`);
  }
}

// ============================================
// Real Pi Integration Notes
// ============================================

console.log('=== Real Pi Integration Notes ===');
console.log(`
In a real Pi Agent you would do:

const agent = new Agent({
  model: yourModel,
  tools: [writeTool, editTool, ...],
  beforeToolCall: constitutionalBeforeToolCall,   // ← exactly this function
  // ... other config
});

The hook receives the real validated args for write/edit tools.
Blocking returns a clean error tool result to the model.

This gives us strong preventive control at very low complexity.
`);