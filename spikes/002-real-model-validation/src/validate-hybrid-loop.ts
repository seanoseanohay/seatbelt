/**
 * Real Model Validation Spike - Hybrid Governance Loop
 *
 * Supports two backends (chosen via BACKEND env var):
 *   - openai     → Normal OpenAI API key + pi-ai (gpt-4o, o1, etc.)
 *   - codex-cli  → Uses the local `codex` CLI (your ChatGPT login)
 */

import { callImplementer, type ImplementerBackend } from './implementer.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

const BACKEND = (process.env.BACKEND as ImplementerBackend) || 'openai';
const WORKTREE = path.join(tmpdir(), 'seatbelt-real-validation');

// === Heuristic thresholds for the safety net ===
const HEURISTIC_MAX_FILES = 2;
const HEURISTIC_MAX_LINES = 80;
const HIGH_RISK_PATTERNS = ['service', 'index', 'main', 'app', 'core'];

// === State tracking for hybrid heuristics + structural analysis ===
let filesChangedSinceReview = 0;
let linesChangedSinceReview = 0;
let touchedHighRiskFiles: string[] = [];
let filesModifiedInUnit: Set<string> = new Set();   // Actual files touched in this unit

// === Correction mode state (for fake Auditor + loop) ===
let inCorrectionMode = false;
let correctionViolations: string[] = [];
let correctionIteration = 0;
const MAX_CORRECTION_ITERATIONS = 3;
let allowedFilesDuringCorrection: Set<string> = new Set();

// === New: Activity-based forced review counter (harness-driven) ===
let mutationsSinceLastReview = 0;
const FORCED_REVIEW_AFTER_MUTATIONS = 3;  // Force review after this many writes/edits

function resetReviewTracking() {
  filesChangedSinceReview = 0;
  linesChangedSinceReview = 0;
  touchedHighRiskFiles = [];
  filesModifiedInUnit.clear();
  mutationsSinceLastReview = 0;
}

function enterCorrectionMode(violations: string[], filesAtReviewTime: string[]) {
  inCorrectionMode = true;
  correctionIteration = 1; // first correction iteration
  correctionViolations = violations;
  allowedFilesDuringCorrection = new Set(filesAtReviewTime);

  console.log(`[CONTROLLER] Entering correction mode (iteration 1/${MAX_CORRECTION_ITERATIONS}). Allowed files: ${[...allowedFilesDuringCorrection].join(', ') || 'none yet'}`);
}

function isHighRiskFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return HIGH_RISK_PATTERNS.some(pattern => lower.includes(pattern));
}

function updateWorkStats(filePath: string, approxLines: number) {
  filesChangedSinceReview += 1;
  linesChangedSinceReview += approxLines;
  filesModifiedInUnit.add(filePath);

  if (isHighRiskFile(filePath) && !touchedHighRiskFiles.includes(filePath)) {
    touchedHighRiskFiles.push(filePath);
  }
}

function checkHeuristicSafetyNet(): string | null {
  if (filesChangedSinceReview >= HEURISTIC_MAX_FILES) {
    return `Heuristic: ${filesChangedSinceReview} files changed (threshold ${HEURISTIC_MAX_FILES})`;
  }
  if (linesChangedSinceReview >= HEURISTIC_MAX_LINES) {
    return `Heuristic: ${linesChangedSinceReview} lines changed (threshold ${HEURISTIC_MAX_LINES})`;
  }
  if (touchedHighRiskFiles.length > 0) {
    return `Heuristic: Touched high-risk file(s): ${touchedHighRiskFiles.join(', ')}`;
  }
  return null;
}

// === Stronger Auditor for validation spike ===
// Focus: Catch structural problems even on small changes, especially the single-file pattern.
async function runMinimalAuditor(): Promise<string[]> {
  const violations: string[] = [];

  // Basic volume checks
  if (linesChangedSinceReview > 80) {
    violations.push(`Change is too large (${linesChangedSinceReview} lines). Prefer smaller, focused units of work.`);
  }
  if (filesChangedSinceReview > 2) {
    violations.push(`Too many files changed (${filesChangedSinceReview}) for one logical unit.`);
  }
  if (touchedHighRiskFiles.length > 0) {
    violations.push(`Accretion risk: Touched high-risk file(s) ${touchedHighRiskFiles.join(', ')} without creating a new focused module.`);
  }

  // === Structural code analysis ===
  let totalExportedItems = 0;
  const filesWithMixedConcerns: string[] = [];

  for (const file of filesModifiedInUnit) {
    try {
      const content = await readFile(path.join(WORKTREE, file), 'utf-8');

      // Count exported behavioral items (functions, consts that are functions or objects with methods)
      const exportMatches = content.match(/export\s+(function|const|let|var|async function)\s+\w+/g) || [];
      const typeOnlyExports = content.match(/export\s+(type|interface)\s+\w+/g) || [];

      const behavioralExports = exportMatches.length;
      totalExportedItems += behavioralExports;

      // Detect mixing of types + significant behavior in one file
      const hasTypes = typeOnlyExports.length > 0;
      const hasBehavior = behavioralExports >= 2;

      if (hasTypes && hasBehavior && filesModifiedInUnit.size === 1) {
        filesWithMixedConcerns.push(file);
      }

      // Flag individual files that are becoming god files
      if (behavioralExports >= 5) {
        violations.push(`File ${file} exports ~${behavioralExports} behavioral items — high risk of mixing responsibilities.`);
      }
    } catch (e) {
      // ignore unreadable files
    }
  }

  // Stronger single-file check for small utilities (the pattern we're repeatedly seeing)
  if (filesModifiedInUnit.size === 1) {
    const onlyFile = Array.from(filesModifiedInUnit)[0];
    const behavioralCount = totalExportedItems;

    if (behavioralCount >= 3) {
      violations.push(
        `Structural issue: ${behavioralCount}+ exported items in a single file (${onlyFile}) for what appears to be a small utility. ` +
        `Strongly prefer separating types from implementation.`
      );
    }
  }

  // Cross-file SRP signal
  if (totalExportedItems > 6 && filesChangedSinceReview <= 2) {
    violations.push(`High SRP risk: Large number of exports (~${totalExportedItems}) concentrated in very few files.`);
  }

  return violations;
}

async function ensureWorktree() {
  if (!existsSync(WORKTREE)) {
    await mkdir(WORKTREE, { recursive: true });
    try {
      const { spawnSync } = await import('child_process');
      spawnSync('git', ['init', '-q'], { cwd: WORKTREE, stdio: 'ignore' });
      spawnSync('git', ['commit', '--allow-empty', '-m', 'initial'], { cwd: WORKTREE, stdio: 'ignore' });
    } catch {}
  }
}

async function handleTool(name: string, args: any) {
  // Stronger enforcement during correction mode
  if (inCorrectionMode) {
    const targetFile = args.path;

    if (name === 'write') {
      return `BLOCKED: Cannot create new files (${targetFile}) while in correction mode. Only edit existing files from the reviewed unit.`;
    }

    if (name === 'edit' && targetFile && !allowedFilesDuringCorrection.has(targetFile)) {
      return `BLOCKED: Cannot edit ${targetFile} during correction. Only allowed to edit files that were part of the reviewed unit: ${[...allowedFilesDuringCorrection].join(', ') || 'none'}`;
    }
  }

  if (name === 'write') {
    const full = path.join(WORKTREE, args.path);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, args.content, 'utf-8');
    return `Wrote ${args.path}`;
  }
  if (name === 'edit') {
    const full = path.join(WORKTREE, args.path);
    let content = '';
    try { content = await readFile(full, 'utf-8'); } catch {}
    await writeFile(full, content.replace(args.oldText, args.newText), 'utf-8');
    return `Edited ${args.path}`;
  }
  if (name === 'review_unit') {
    return `REVIEW_REQUESTED: ${args.summary}`;
  }
  return 'Unknown tool';
}

async function main() {
  console.log('=== Seatbelt Real Model Validation ===');
  console.log('Backend:', BACKEND);

  if (BACKEND === 'codex-cli') {
    console.log('Using local Codex CLI (your ChatGPT login via `codex login`).');
  }

  console.log('Worktree:', WORKTREE);
  console.log(`Heuristic thresholds: ${HEURISTIC_MAX_FILES} files or ${HEURISTIC_MAX_LINES} lines`);
  console.log(`Max correction iterations: ${MAX_CORRECTION_ITERATIONS}`);
  console.log('');

  await ensureWorktree();
  resetReviewTracking();
  inCorrectionMode = false;
  correctionViolations = [];
  correctionIteration = 0;

  const tools = [
    { name: 'write', description: 'Write content to a file', parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
    { name: 'edit', description: 'Edit a file', parameters: { type: 'object', properties: { path: { type: 'string' }, oldText: { type: 'string' }, newText: { type: 'string' } }, required: ['path', 'oldText', 'newText'] } },
    { name: 'review_unit', description: 'Call when you have finished a logical unit of work', parameters: { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'] } },
  ];

  const baseTask = process.env.TASK || "Create a small, clean TypeScript utility for user notification preferences (email, SMS, push). Follow good separation of concerns.";

  let effectiveSystem = `You are operating under strict constitutional governance (Seatbelt).

Rules:
- Make small, focused changes
- Avoid functions doing too many things
- Do not accrete onto god files — create new modules instead

When you complete a logical unit of work, call the "review_unit" tool.

Task: ${baseTask}`;

  for (let turn = 1; turn <= 20; turn++) {
    console.log(`\n--- Turn ${turn} ---`);
    console.log(`Work since last review → files: ${filesChangedSinceReview}, lines: ${linesChangedSinceReview}`);

    // === Key Fix: Heuristics now actually force reviews ===
    const heuristic = checkHeuristicSafetyNet();
    if (heuristic && !inCorrectionMode) {
      console.log(`\n*** HEURISTIC SAFETY NET FORCING REVIEW ***`);
      console.log(heuristic);

      // Force an Auditor run using current accumulated state
      const violations = await runMinimalAuditor();

      if (violations.length > 0) {
        console.log('\n[AUDITOR] (Forced by heuristic) ❌ Violations found:');
        violations.forEach((v, i) => console.log(`  ${i + 1}. ${v}`));

        enterCorrectionMode(violations, Array.from(filesModifiedInUnit));

        if (correctionIteration >= MAX_CORRECTION_ITERATIONS) {
          console.log('\n*** MAX CORRECTION ITERATIONS REACHED (heuristic forced) ***');
          console.log('In a real Seatbelt this would require an explicit override or human escalation.\n');
          return;
        }

        // Reset tracking so the correction work starts fresh
        resetReviewTracking();
      } else {
        console.log('\n[AUDITOR] (Forced by heuristic) ✅ No violations at this volume. Resetting tracking.');
        resetReviewTracking();
      }
    }

    // Build prompt for this turn (inject correction instructions if active)
    let turnSystem = effectiveSystem;
    if (inCorrectionMode && correctionViolations.length > 0) {
      turnSystem = `You are in CORRECTION MODE.

You must ONLY fix the following constitutional violations. Do not add new functionality or make unrelated improvements:

${correctionViolations.map((v, i) => `${i + 1}. ${v}`).join('\n')}

Call review_unit again once you believe the violations are resolved.

Original task context: ${baseTask}`;
    }

    const { text, toolCalls } = await callImplementer(BACKEND, turnSystem, tools);

    if (toolCalls.length > 0) {
      for (const tc of toolCalls) {
        const result = await handleTool(tc.name, tc.arguments || {});
        console.log(`[Tool] ${tc.name} → ${result}`);

        if (tc.name === 'write' && tc.arguments?.path && tc.arguments?.content) {
          updateWorkStats(tc.arguments.path, (tc.arguments.content as string).split('\n').length);
          mutationsSinceLastReview++;
        }
        if (tc.name === 'edit' && tc.arguments?.path) {
          const est = ((tc.arguments.newText as string) || '').split('\n').length;
          updateWorkStats(tc.arguments.path, est);
          mutationsSinceLastReview++;
        }

        if (tc.name === 'review_unit') {
          console.log('\n*** MODEL CALLED review_unit ***');
          console.log(`Summary: ${tc.arguments?.summary || ''}`);
          console.log('Stats at call time:', { filesChangedSinceReview, linesChangedSinceReview, touchedHighRiskFiles });

          // === Run the Fake Auditor ===
          const violations = await runMinimalAuditor();

          if (violations.length === 0) {
            console.log('\n[AUDITOR] ✅ Clean pass. No constitutional violations detected.');
            resetReviewTracking();
            inCorrectionMode = false;
            correctionViolations = [];
            correctionIteration = 0;
            return; // End run on clean review for focused data
          } else {
            console.log('\n[AUDITOR] ❌ Violations found:');
            violations.forEach((v, i) => console.log(`  ${i + 1}. ${v}`));

            if (!inCorrectionMode) {
              enterCorrectionMode(violations, Array.from(filesModifiedInUnit));
            } else {
              correctionViolations = violations;
              correctionIteration++;
              console.log(`\n[CONTROLLER] Entering correction mode (iteration ${correctionIteration}/${MAX_CORRECTION_ITERATIONS}).`);
            }

            if (correctionIteration >= MAX_CORRECTION_ITERATIONS) {
              console.log('\n*** MAX CORRECTION ITERATIONS REACHED ***');
              console.log('In a real Seatbelt this would require an explicit override or human escalation.\n');
              return;
            }

            // Continue the loop so the model gets the correction prompt on the next turn
            resetReviewTracking(); // Reset stats for the correction work
          }
        }
      }
    } else {
      console.log(text || '(no text output)');
    }

    // === New: Activity-based forced review (harness-driven, independent of review_unit) ===
    if (!inCorrectionMode && mutationsSinceLastReview >= FORCED_REVIEW_AFTER_MUTATIONS) {
      console.log(`\n*** FORCED REVIEW TRIGGERED BY ACTIVITY (after ${mutationsSinceLastReview} mutations) ***`);

      const violations = await runMinimalAuditor();

      if (violations.length > 0) {
        console.log('\n[AUDITOR] (Forced by activity) ❌ Violations found:');
        violations.forEach((v, i) => console.log(`  ${i + 1}. ${v}`));

        enterCorrectionMode(violations, Array.from(filesModifiedInUnit));

        if (correctionIteration >= MAX_CORRECTION_ITERATIONS) {
          console.log('\n*** MAX CORRECTION ITERATIONS REACHED (activity forced) ***');
          console.log('In a real Seatbelt this would require an explicit override or human escalation.\n');
          return;
        }

        resetReviewTracking();
      } else {
        console.log('\n[AUDITOR] (Forced by activity) ✅ No violations. Resetting mutation counter.');
        mutationsSinceLastReview = 0;  // reset even if clean, to avoid spamming
      }
    }
  }

  console.log('\nReached turn limit.');
}

main().catch(console.error);
