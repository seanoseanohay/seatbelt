/**
 * Spike Experiment 2b: Hybrid Checkpoint (Approach 1 + Approach 2 Combined)
 *
 * Goal: Simulate how a hybrid checkpoint strategy actually behaves in practice.
 *
 * Hybrid Model:
 * - Primary: Custom "review_unit" tool (Approach 1) — preferred when the model cooperates.
 * - Safety Net: External heuristics + shouldStopAfterTurn (Approach 2) — forces review
 *   if the model ignores the tool or keeps working past safe thresholds.
 *
 * This is the strategy recommended from Experiment 2.
 */

console.log('=== Seatbelt × Pi Governance Spike ===');
console.log('Experiment 2b: Hybrid Checkpoint (Custom Tool + External Heuristics)\n');

// ============================================
// Configuration
// ============================================

const MAX_FILES_WITHOUT_REVIEW = 2;
const MAX_LINES_WITHOUT_REVIEW = 90;

// ============================================
// Simulation State (what the Seatbelt would track)
// ============================================

let protectedWorktreeState = {
  filesChangedSinceReview: 0,
  linesChangedSinceReview: 0,
  lastReviewTurn: 0,
};

function resetWorktreeTracking() {
  protectedWorktreeState.filesChangedSinceReview = 0;
  protectedWorktreeState.linesChangedSinceReview = 0;
}

// ============================================
// Hybrid Checkpoint Logic (what the Seatbelt controller would do)
// ============================================

function shouldForceReview(turn: any): { shouldReview: boolean; reason: string } {
  // Safety net: external heuristics
  if (turn.filesChangedSinceReview >= MAX_FILES_WITHOUT_REVIEW) {
    return {
      shouldReview: true,
      reason: `External heuristic: ${turn.filesChangedSinceReview} files changed since last review (threshold: ${MAX_FILES_WITHOUT_REVIEW})`,
    };
  }

  if (turn.linesChangedSinceReview >= MAX_LINES_WITHOUT_REVIEW) {
    return {
      shouldReview: true,
      reason: `External heuristic: ${turn.linesChangedSinceReview} lines changed since last review (threshold: ${MAX_LINES_WITHOUT_REVIEW})`,
    };
  }

  return { shouldReview: false, reason: '' };
}

// ============================================
// Simulated Agent Behavior
// ============================================

interface SimulatedTurn {
  number: number;
  actions: string[];
  filesTouched: number;
  linesTouched: number;
  agentCallsReviewTool: boolean; // Does the model remember to call review_unit?
}

const scenarios: { name: string; turns: SimulatedTurn[] }[] = [
  {
    name: 'Model cooperates well',
    turns: [
      { number: 1, actions: ['read userService.ts'], filesTouched: 0, linesTouched: 0, agentCallsReviewTool: false },
      { number: 2, actions: ['edit userService.ts'], filesTouched: 1, linesTouched: 40, agentCallsReviewTool: false },
      { number: 3, actions: ['write taxCalculator.ts'], filesTouched: 1, linesTouched: 25, agentCallsReviewTool: true },
    ],
  },
  {
    name: 'Model ignores review tool (safety net triggers)',
    turns: [
      { number: 1, actions: ['read userService.ts'], filesTouched: 0, linesTouched: 0, agentCallsReviewTool: false },
      { number: 2, actions: ['edit userService.ts'], filesTouched: 1, linesTouched: 50, agentCallsReviewTool: false },
      { number: 3, actions: ['write newModule.ts'], filesTouched: 1, linesTouched: 60, agentCallsReviewTool: false },
      { number: 4, actions: ['edit newModule.ts'], filesTouched: 1, linesTouched: 30, agentCallsReviewTool: false },
    ],
  },
  {
    name: 'Mixed behavior (model eventually cooperates)',
    turns: [
      { number: 1, actions: ['edit userService.ts'], filesTouched: 1, linesTouched: 55, agentCallsReviewTool: false },
      { number: 2, actions: ['write utils.ts'], filesTouched: 1, linesTouched: 40, agentCallsReviewTool: false },
      { number: 3, actions: ['edit utils.ts'], filesTouched: 1, linesTouched: 25, agentCallsReviewTool: true },
    ],
  },
];

// ============================================
// Main Simulation
// ============================================

for (const scenario of scenarios) {
  console.log(`\n============================================================`);
  console.log(`SCENARIO: ${scenario.name}`);
  console.log(`============================================================\n`);

  resetWorktreeTracking();
  let reviewCount = 0;

  for (const turn of scenario.turns) {
    // Update Seatbelt's view of the worktree
    protectedWorktreeState.filesChangedSinceReview += turn.filesTouched;
    protectedWorktreeState.linesChangedSinceReview += turn.linesTouched;

    console.log(`Turn ${turn.number}: ${turn.actions.join(', ')}`);
    console.log(`  Worktree delta since last review → files: ${protectedWorktreeState.filesChangedSinceReview}, lines: ${protectedWorktreeState.linesChangedSinceReview}`);

    // Check 1: Does the agent voluntarily call the review tool?
    if (turn.agentCallsReviewTool) {
      console.log(`  → Agent voluntarily calls "review_unit" tool`);
      console.log(`  → Seatbelt intercepts → HIGH QUALITY review triggered (Auditor gets clean "unit complete" signal)`);
      console.log(`  → Auditor runs. Correction loop if needed.\n`);
      resetWorktreeTracking();
      reviewCount++;
      continue;
    }

    // Check 2: External safety net heuristic
    const forceResult = shouldForceReview({
      filesChangedSinceReview: protectedWorktreeState.filesChangedSinceReview,
      linesChangedSinceReview: protectedWorktreeState.linesChangedSinceReview,
    });

    if (forceResult.shouldReview) {
      console.log(`  → ${forceResult.reason}`);
      console.log(`  → Seatbelt uses shouldStopAfterTurn hook to FORCE a checkpoint`);
      console.log(`  → Auditor runs on current diff (lower quality signal than voluntary review_unit, but reliable)`);
      console.log(`  → Correction loop if needed.\n`);
      resetWorktreeTracking();
      reviewCount++;
      continue;
    }

    console.log(`  → No review triggered this turn. Agent continues.\n`);
  }

  console.log(`→ Total reviews forced in this scenario: ${reviewCount}\n`);
}

console.log('=== Hybrid Strategy Observations ===\n');

console.log('Strengths of the Hybrid:');
console.log('  + When the model cooperates (calls review_unit), we get high-quality, semantically meaningful reviews.');
console.log('  + When the model drifts or ignores the tool, the external heuristic still protects the codebase.');
console.log('  + The safety net prevents the "death by a thousand small changes" problem.');
console.log('  + Gives the Seatbelt both reliability and quality without being overly punitive.');

console.log('\nWeaknesses / Tensions:');
console.log('  - Two different review "flavors" (voluntary high-quality vs forced heuristic).');
console.log('  - Heuristic thresholds need tuning (too low = annoying, too high = risk of large messy units).');
console.log('  - Still requires the model to be somewhat trained/instructed to use the review_unit tool.');

console.log('\nRecommendation for Vertical Slice:');
console.log('  Proceed with the hybrid model. Make the external heuristic thresholds configurable per profile.');
console.log('  Start conservative (review more often) and relax as we gain confidence.');