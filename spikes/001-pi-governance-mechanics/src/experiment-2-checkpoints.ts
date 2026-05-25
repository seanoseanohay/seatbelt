/**
 * Spike Experiment 2: Checkpoint Mechanisms for "Unit of Work" Review
 *
 * Narrow scope:
 * - Compare realistic ways to force constitutional review at logical boundaries
 *   (not just per-tool-call).
 * - Focus on feasibility for the Seatbelt's needs: reliable, autonomous,
 *   low human intervention.
 *
 * Approaches tested:
 *   1. Custom Tool Interception (review_unit tool)
 *   2. shouldStopAfterTurn + Heuristics
 *   3. Injected Review via prepareNextTurn / Steering
 */

console.log('=== Seatbelt × Pi Governance Spike ===');
console.log('Experiment 2: Checkpoint Mechanisms\n');

// ============================================
// Shared Simulation Helpers
// ============================================

interface Turn {
  number: number;
  actions: string[];
  filesChanged: number;
  totalLinesChanged: number;
  agentSaysDone?: boolean;
}

function simulateAgentTurns(): Turn[] {
  return [
    { number: 1, actions: ['read userService.ts'], filesChanged: 0, totalLinesChanged: 0 },
    { number: 2, actions: ['edit userService.ts'], filesChanged: 1, totalLinesChanged: 45 },
    { number: 3, actions: ['write newModule.ts', 'edit userService.ts'], filesChanged: 2, totalLinesChanged: 120 },
    { number: 4, actions: ['edit newModule.ts', 'write tests'], filesChanged: 2, totalLinesChanged: 80, agentSaysDone: true },
  ];
}

// ============================================
// Approach 1: Custom Tool Interception (review_unit)
// ============================================

function approach1_CustomToolInterception() {
  console.log('--- Approach 1: Custom Tool Interception (review_unit tool) ---\n');

  const turns = simulateAgentTurns();
  let reviewTriggered = false;

  for (const turn of turns) {
    console.log(`Turn ${turn.number}: ${turn.actions.join(', ')}`);

    // Simulate agent deciding to call a special review tool
    if (turn.agentSaysDone) {
      console.log('  Agent calls special "review_unit" tool (instructed in system prompt)');
      console.log('  → Seatbelt INTERCEPTS in beforeToolCall');
      console.log('  → Triggers full Auditor review on current diff');
      console.log('  → Enters Correction Loop if violations found\n');
      reviewTriggered = true;
      break;
    } else {
      console.log('  No review signal yet.\n');
    }
  }

  console.log('Pros:');
  console.log('  + Very explicit and controllable');
  console.log('  + Easy to make mandatory via beforeToolCall');
  console.log('  + Clear "this is a checkpoint" moment for the Auditor');
  console.log('Cons:');
  console.log('  - Relies on the model actually calling the tool when appropriate');
  console.log('  - Model might try to avoid it or call it too early/late');
  console.log('  - Requires good prompting + possibly tool description pressure\n');

  return reviewTriggered;
}

// ============================================
// Approach 2: shouldStopAfterTurn + Heuristics
// ============================================

function approach2_ShouldStopAfterTurn() {
  console.log('--- Approach 2: shouldStopAfterTurn + Structural Heuristics ---\n');

  const turns = simulateAgentTurns();
  let reviewTriggered = false;

  for (const turn of turns) {
    console.log(`Turn ${turn.number}: ${turn.actions.join(', ')} (files: ${turn.filesChanged}, lines: ${turn.totalLinesChanged})`);

    // Seatbelt's external heuristic logic (outside the model)
    const shouldReview =
      turn.filesChanged >= 2 ||
      turn.totalLinesChanged > 100 ||
      turn.agentSaysDone === true;

    if (shouldReview) {
      console.log('  → Seatbelt decides externally that a checkpoint is needed');
      console.log('  → Uses shouldStopAfterTurn hook to pause the agent');
      console.log('  → Runs Auditor on accumulated work in protected worktree\n');
      reviewTriggered = true;
      break;
    } else {
      console.log('  No external trigger yet.\n');
    }
  }

  console.log('Pros:');
  console.log('  + Does not rely on model cooperation for triggering');
  console.log('  + Seatbelt stays in control of when reviews happen');
  console.log('  + Can use real diff size + file count from the worktree');
  console.log('Cons:');
  console.log('  - Heuristics can be crude (risk of reviewing too often or too late)');
  console.log('  - Less "semantic" than the agent deciding it is done with a unit');
  console.log('  - Requires the Seatbelt to monitor state across turns\n');

  return reviewTriggered;
}

// ============================================
// Approach 3: Injected Review via Steering / prepareNextTurn
// ============================================

function approach3_InjectedReview() {
  console.log('--- Approach 3: Injected Review via Steering Messages ---\n');

  const turns = simulateAgentTurns();
  let reviewTriggered = false;

  for (const turn of turns) {
    console.log(`Turn ${turn.number}`);

    if (turn.agentSaysDone) {
      console.log('  Agent signals completion.');
      console.log('  → Seatbelt injects a steering message: "Before continuing, review the changes you just made against the constitution and fix any issues."');
      console.log('  → Or uses prepareNextTurn to modify context / force a review-oriented next turn\n');
      reviewTriggered = true;
      break;
    }
  }

  console.log('Pros:');
  console.log('  + Leverages existing Pi steering/follow-up mechanisms');
  console.log('  + Keeps everything inside the normal agent conversation flow');
  console.log('Cons:');
  console.log('  - Still somewhat dependent on model behavior');
  console.log('  - Less of a "hard gate" than the other two approaches');
  console.log('  - Can feel like just another prompt the model might ignore under pressure\n');

  return reviewTriggered;
}

// ============================================
// Main Comparison
// ============================================

console.log('Simulating the same sequence of turns under each checkpoint strategy...\n');

const result1 = approach1_CustomToolInterception();
const result2 = approach2_ShouldStopAfterTurn();
const result3 = approach3_InjectedReview();

console.log('=== Summary Comparison ===\n');

console.log('Approach                        | Model Cooperation Required | Hard Gate Strength | Recommended for Slice?');
console.log('--------------------------------|----------------------------|--------------------|------------------------');
console.log(`1. Custom Tool Interception     | High                       | High               | Strong candidate`);
console.log(`2. shouldStopAfterTurn + Heur.  | Low                        | High               | Strong candidate`);
console.log(`3. Steering / prepareNextTurn   | Medium                     | Medium             | Secondary / supportive`);

console.log('\n=== Key Recommendation from this Experiment ===');
console.log('The best path for the narrow vertical slice appears to be a *combination* of:');
console.log('- Approach 2 (external heuristics via shouldStopAfterTurn) as the reliable safety net');
console.log('- Approach 1 (custom review tool) as the primary, higher-quality signal when the model cooperates');
console.log('');
console.log('This gives us both reliability and semantic quality without putting all our eggs in the "model will call the special tool" basket.');
console.log('');
console.log('Next: We should prototype the combined approach in a follow-up micro-experiment if needed,');
console.log('then feed these learnings back into the Vertical Slice Design.');
