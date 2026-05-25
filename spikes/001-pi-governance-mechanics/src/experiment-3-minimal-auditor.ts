/**
 * Spike Experiment 3: Minimal Auditor + Correction Loop
 *
 * Narrow scope for this micro-experiment:
 * - Simulate what happens after a checkpoint fires (from the hybrid system in 2b).
 * - A very small Auditor that checks against the v1 Constitution principles.
 * - A basic Correction Loop that gives the implementer narrow repair instructions.
 * - Show different outcomes (clean pass, minor violation, serious violation).
 *
 * This is deliberately simplified — we are only trying to understand the dynamics
 * of Auditor → Correction Loop interaction, not build a real auditor yet.
 */

console.log('=== Seatbelt × Pi Governance Spike ===');
console.log('Experiment 3: Minimal Auditor + Correction Loop\n');

// ============================================
// v1 Constitution (simplified for the spike)
// ============================================

const CONSTITUTION_RULES = [
  {
    id: 'SRP',
    description: 'Functions and modules should have one clear responsibility.',
    check: (work: any) => {
      if (work.newFunctions > 1 && work.concernsTouched > 2) {
        return {
          violated: true,
          severity: 'medium',
          message: `Likely SRP violation: ${work.newFunctions} new functions touching ${work.concernsTouched} different concerns in one unit.`,
        };
      }
      return { violated: false };
    },
  },
  {
    id: 'SmallFocusedChange',
    description: 'A logical unit of work should stay reasonably small and cohesive.',
    check: (work: any) => {
      if (work.linesChanged > 80) {
        return {
          violated: true,
          severity: 'high',
          message: `Change is too large (${work.linesChanged} lines). Prefer smaller, focused units of work.`,
        };
      }
      if (work.filesChanged > 3) {
        return {
          violated: true,
          severity: 'medium',
          message: `Too many files changed (${work.filesChanged}) for one logical unit.`,
        };
      }
      return { violated: false };
    },
  },
  {
    id: 'NoGodModuleAccretion',
    description: 'Avoid continuing to grow already-large or complex files.',
    check: (work: any) => {
      if (work.touchedGodFile) {
        return {
          violated: true,
          severity: 'high',
          message: `Touched a known high-risk file (${work.touchedGodFile}) without creating a new focused module.`,
        };
      }
      return { violated: false };
    },
  },
];

// ============================================
// Minimal Auditor
// ============================================

function runAuditor(work: any) {
  console.log('  [Auditor] Running against current work...');
  const violations = [];

  for (const rule of CONSTITUTION_RULES) {
    const result = rule.check(work);
    if (result.violated) {
      violations.push({
        rule: rule.id,
        severity: result.severity,
        message: result.message,
      });
    }
  }

  if (violations.length === 0) {
    console.log('  [Auditor] ✅ Clean. No violations against v1 Constitution.\n');
    return { status: 'clean', violations: [] };
  }

  console.log(`  [Auditor] ❌ Found ${violations.length} violation(s):`);
  violations.forEach(v => {
    console.log(`    - [${v.severity}] ${v.rule}: ${v.message}`);
  });
  console.log('');

  return { status: 'violations', violations };
}

// ============================================
// Correction Loop (simulated)
// ============================================

function runCorrectionLoop(initialWork: any, maxIterations = 3) {
  let currentWork = { ...initialWork };
  let iteration = 1;

  while (iteration <= maxIterations) {
    console.log(`\n--- Correction Iteration ${iteration} ---`);

    // Simulate giving the implementer narrow instructions
    const auditorResult = runAuditor(currentWork);

    if (auditorResult.status === 'clean') {
      console.log('  [Controller] Correction successful. Work now passes constitutional review.\n');
      return { success: true, finalWork: currentWork, iterations: iteration };
    }

    // Simulate the implementer trying to fix only the reported issues
    console.log('  [Controller] Sending narrow repair instructions to implementer:');
    auditorResult.violations.forEach(v => {
      console.log(`    → Fix only: ${v.message}`);
    });

    // Simulate the model making a partial fix (sometimes good, sometimes not enough)
    const fixQuality = Math.random();

    if (fixQuality > 0.75) {
      console.log('  [Implementer] Made good targeted fixes. Re-evaluating...\n');
      // Improve the work state
      currentWork.linesChanged = Math.max(30, Math.floor(currentWork.linesChanged * 0.6));
      currentWork.newFunctions = Math.max(1, currentWork.newFunctions - 1);
      currentWork.concernsTouched = Math.max(2, currentWork.concernsTouched - 1);
    } else if (fixQuality > 0.4) {
      console.log('  [Implementer] Partial improvement, but still some issues remain.\n');
      currentWork.linesChanged = Math.max(40, Math.floor(currentWork.linesChanged * 0.8));
    } else {
      console.log('  [Implementer] Weak response — mostly ignored the narrow scope.\n');
      // Almost no improvement
    }

    iteration++;
  }

  console.log('  [Controller] Max iterations reached without clean pass.\n');
  return { success: false, finalWork: currentWork, iterations: iteration - 1 };
}

// ============================================
// Scenarios
// ============================================

const scenarios = [
  {
    name: 'Clean unit (good checkpoint)',
    work: {
      linesChanged: 45,
      filesChanged: 2,
      newFunctions: 1,
      concernsTouched: 2,
      touchedGodFile: false,
    },
  },
  {
    name: 'Medium violation (SRP + size)',
    work: {
      linesChanged: 95,
      filesChanged: 3,
      newFunctions: 3,
      concernsTouched: 4,
      touchedGodFile: false,
    },
  },
  {
    name: 'Serious violation (god file accretion)',
    work: {
      linesChanged: 70,
      filesChanged: 2,
      newFunctions: 2,
      concernsTouched: 3,
      touchedGodFile: 'userService.ts',
    },
  },
];

// ============================================
// Run Scenarios
// ============================================

for (const scenario of scenarios) {
  console.log(`\n============================================================`);
  console.log(`SCENARIO: ${scenario.name}`);
  console.log(`============================================================`);

  const result = runCorrectionLoop(scenario.work);

  if (result.success) {
    console.log(`→ Final result: PASSED after ${result.iterations} correction iteration(s).`);
  } else {
    console.log(`→ Final result: STILL VIOLATIONS after ${result.iterations} iterations.`);
    console.log(`  Options at this point: Force override (with justification) or escalate to human.`);
  }
}

console.log('\n=== Experiment 3 Observations ===\n');

console.log('What this simulation suggests:');
console.log('  - A narrow Auditor + Correction Loop can often resolve medium issues in 1-2 iterations.');
console.log('  - When the implementer ignores the "fix only these" constraint, the loop can stall.');
console.log('  - Having both a high-quality voluntary checkpoint and a forced heuristic checkpoint');
console.log('    creates two different "review contexts" for the Auditor (this may need handling later).');
console.log('');
console.log('Risks highlighted:');
console.log('  - Correction loops that don\'t converge are a real possibility.');
console.log('  - We will need a clear "max iterations + override" policy.');
console.log('  - The Auditor needs to be able to distinguish between "easy fix" and "this unit is fundamentally messy".');
console.log('');
console.log('Implication for Vertical Slice:');
console.log('  A very simple rule-based Auditor + correction loop is probably sufficient for v1,');
console.log('  as long as we have a clean override path and good visibility for the user.');