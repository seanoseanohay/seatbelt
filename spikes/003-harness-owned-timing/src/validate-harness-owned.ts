/**
 * Spike 003: Harness-Owned Review Timing Validation
 *
 * THE KEY DIFFERENCE from 002:
 * - No `review_unit` tool is ever exposed to the model.
 * - The harness (this loop) decides when to run the Auditor.
 * - Reviews are forced after writes/edits using activity + structural signals.
 * - Correction mode uses *restricted tool lists* + narrow prompts.
 * - A unit is only "clean" when the harness sees a clean Auditor result on its own terms.
 *
 * This closes the "model produces mess then immediately self-reviews for clean pass" escape.
 */

import { callImplementer, type ImplementerBackend } from './implementer.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

const BACKEND = (process.env.BACKEND as ImplementerBackend) || 'openai';
const WORKTREE = path.join(tmpdir(), 'seatbelt-harness-owned-003');

// === Thresholds (tunable for the spike) ===
const FORCED_REVIEW_AFTER_MUTATIONS = 2;   // Force review after this many writes/edits in the current unit
// Note: We tested =1 successfully in validation. =2 is the current balanced default.
const HEURISTIC_MAX_FILES = 2;
const HEURISTIC_MAX_LINES = 60;            // Slightly tighter than 002 for god-function detection
const HIGH_RISK_PATTERNS = ['service', 'index', 'main', 'app', 'core', 'manager', 'util'];

// === State for current open unit (harness owns this) ===
let mutationsInUnit = 0;
let filesInUnit: Set<string> = new Set();
let linesInUnit = 0;
let touchedHighRiskInUnit: string[] = [];

// === Correction state (harness-enforced) ===
let inCorrectionMode = false;
let correctionViolations: string[] = [];
let correctionIteration = 0;
const MAX_CORRECTION_ITERATIONS = 3;
let allowedFilesInCorrection: Set<string> = new Set();

// === Session stats (for visibility) ===
let totalUnitsClosedClean = 0;

function resetUnitTracking() {
  mutationsInUnit = 0;
  filesInUnit.clear();
  linesInUnit = 0;
  touchedHighRiskInUnit = [];
}

function resetCorrectionState() {
  inCorrectionMode = false;
  correctionViolations = [];
  correctionIteration = 0;
  allowedFilesInCorrection.clear();
}

function isHighRiskFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return HIGH_RISK_PATTERNS.some(p => lower.includes(p));
}

function recordMutation(filePath: string, approxLines: number) {
  filesInUnit.add(filePath);
  linesInUnit += approxLines;
  mutationsInUnit++;

  if (isHighRiskFile(filePath) && !touchedHighRiskInUnit.includes(filePath)) {
    touchedHighRiskInUnit.push(filePath);
  }
}

// === Structural Auditor (ported + usable from 002, can be made stricter here) ===
async function runAuditorOnCurrentUnit(): Promise<string[]> {
  const violations: string[] = [];

  // Volume
  if (linesInUnit > HEURISTIC_MAX_LINES) {
    violations.push(`Change is too large for one unit (${linesInUnit} lines, threshold ~${HEURISTIC_MAX_LINES}). Prefer small focused changes.`);
  }
  if (filesInUnit.size > HEURISTIC_MAX_FILES) {
    violations.push(`Too many files changed (${filesInUnit.size}) for a single logical unit.`);
  }
  if (touchedHighRiskInUnit.length > 0) {
    violations.push(`Accretion risk: touched high-risk file(s) ${touchedHighRiskInUnit.join(', ')} without extracting focused modules.`);
  }

  // Structural analysis on actual written content
  let totalBehavioralExports = 0;
  const filesWithMixedConcerns: string[] = [];

  for (const file of filesInUnit) {
    try {
      const content = await readFile(path.join(WORKTREE, file), 'utf-8');

      const exportMatches = content.match(/export\s+(function|const|let|var|async function)\s+\w+/g) || [];
      const typeOnlyExports = content.match(/export\s+(type|interface)\s+\w+/g) || [];

      const behavioral = exportMatches.length;
      totalBehavioralExports += behavioral;

      const hasTypes = typeOnlyExports.length > 0;
      const hasBehavior = behavioral >= 2;

      if (hasTypes && hasBehavior && filesInUnit.size === 1) {
        filesWithMixedConcerns.push(file);
      }

      if (behavioral >= 5) {
        violations.push(`File ${file} exports ~${behavioral} behavioral items — high risk of mixing responsibilities (god file).`);
      }
    } catch (e) {
      // ignore
    }
  }

  // The exact pattern we saw Codex produce repeatedly: 3+ behavioral items in one small file
  if (filesInUnit.size === 1) {
    const only = Array.from(filesInUnit)[0];
    if (totalBehavioralExports >= 3) {
      violations.push(
        `Structural SRP violation: ${totalBehavioralExports}+ exported behavioral items in a single file (${only}). ` +
        `Strongly prefer separating concerns/types from implementation.`
      );
    }
  }

  // Cross-file concentration signal
  if (totalBehavioralExports > 6 && filesInUnit.size <= 2) {
    violations.push(`High SRP risk: ~${totalBehavioralExports} behavioral exports concentrated in only ${filesInUnit.size} file(s).`);
  }

  // God-function heuristic (rough): look for very long function bodies in the written files
  // (This is a cheap proxy; a real implementation would parse.)
  for (const file of filesInUnit) {
    try {
      const content = await readFile(path.join(WORKTREE, file), 'utf-8');
      // Crude: count functions that have many lines or many obvious sequential responsibilities
      const longFuncMatches = content.match(/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]{300,}?^\s*\}/gm) || [];
      if (longFuncMatches.length > 0) {
        violations.push(`File ${file} contains one or more very large function bodies — likely doing too many things (god function).`);
      }
    } catch {}
  }

  return violations;
}

// === The single decision point the harness owns ===
async function considerAndEnforceReview(): Promise<'clean' | 'violations' | 'no-review-needed'> {
  const shouldReview =
    mutationsInUnit >= FORCED_REVIEW_AFTER_MUTATIONS ||
    filesInUnit.size >= HEURISTIC_MAX_FILES ||
    linesInUnit >= HEURISTIC_MAX_LINES ||
    touchedHighRiskInUnit.length > 0;

  if (!shouldReview) {
    return 'no-review-needed';
  }

  console.log(`\n[HARNESS] === FORCING REVIEW (harness decision, not model) ===`);
  console.log(`   Unit stats: ${mutationsInUnit} mutations, ${filesInUnit.size} files, ~${linesInUnit} lines`);
  if (touchedHighRiskInUnit.length) console.log(`   High-risk files touched: ${touchedHighRiskInUnit.join(', ')}`);

  const violations = await runAuditorOnCurrentUnit();

  if (violations.length === 0) {
    console.log('\n[AUDITOR] ✅ Clean pass — HARNESS declares unit clean and closed.');
    totalUnitsClosedClean++;
    resetUnitTracking();
    return 'clean';
  }

  console.log('\n[AUDITOR] ❌ Violations detected by harness:');
  violations.forEach((v, i) => console.log(`   ${i + 1}. ${v}`));

  // Enter / advance correction (harness owns this state)
  if (!inCorrectionMode) {
    inCorrectionMode = true;
    correctionIteration = 1;
    correctionViolations = violations;
    allowedFilesInCorrection = new Set(filesInUnit);
  } else {
    correctionViolations = violations;
    correctionIteration++;
  }

  console.log(`[CONTROLLER] Correction mode ${correctionIteration}/${MAX_CORRECTION_ITERATIONS}. Allowed edit files: ${[...allowedFilesInCorrection].join(', ')}`);

  if (correctionIteration >= MAX_CORRECTION_ITERATIONS) {
    console.log('\n*** MAX CORRECTION ITERATIONS REACHED (harness-enforced) ***');
    console.log('In real Seatbelt this would surface for explicit override or human review.\n');
    return 'violations';
  }

  // Reset unit stats so the *correction work* starts with a fresh counter
  resetUnitTracking();
  return 'violations';
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

async function handleTool(name: string, args: any): Promise<string> {
  const target = args.path || args.file || '';

  // Hard block in correction (defense in depth)
  if (inCorrectionMode) {
    if (name === 'write') {
      return `BLOCKED (correction): Cannot create new files. Only edit files from the reviewed unit: ${[...allowedFilesInCorrection].join(', ')}`;
    }
    if (name === 'edit' && target && !allowedFilesInCorrection.has(target)) {
      return `BLOCKED (correction): Cannot edit ${target}. Only these files: ${[...allowedFilesInCorrection].join(', ')}`;
    }
  }

  if (name === 'write') {
    const full = path.join(WORKTREE, args.path);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, args.content, 'utf-8');
    recordMutation(args.path, (args.content || '').split('\n').length);
    return `Wrote ${args.path}`;
  }

  if (name === 'edit') {
    const full = path.join(WORKTREE, args.path);
    let content = '';
    try { content = await readFile(full, 'utf-8'); } catch {}
    await writeFile(full, content.replace(args.oldText, args.newText), 'utf-8');
    const delta = (args.newText || '').split('\n').length;
    recordMutation(args.path, delta);
    return `Edited ${args.path}`;
  }

  return `Unknown or unsupported tool: ${name}`;
}

// Build the tool list the model is allowed to see *this turn*
function getToolsForCurrentMode() {
  if (inCorrectionMode) {
    // Only edit, and the prompt will tell it exactly which paths
    return [
      { name: 'edit', description: 'Edit an existing file (correction mode: only previously touched files in this unit)', parameters: { type: 'object', properties: { path: { type: 'string' }, oldText: { type: 'string' }, newText: { type: 'string' } }, required: ['path', 'oldText', 'newText'] } },
    ];
  }
  return [
    { name: 'write', description: 'Write content to a (new) file', parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
    { name: 'edit', description: 'Edit an existing file', parameters: { type: 'object', properties: { path: { type: 'string' }, oldText: { type: 'string' }, newText: { type: 'string' } }, required: ['path', 'oldText', 'newText'] } },
  ];
}

function buildSystemPrompt(baseTask: string): string {
  if (inCorrectionMode && correctionViolations.length > 0) {
    const allowedList = [...allowedFilesInCorrection].join(', ') || '(none yet — this is likely a harness bug)';
    return `You are in STRICT CORRECTION MODE under Seatbelt constitutional governance.

You MUST ONLY address the following violations. Do not add new features, do not refactor unrelated code, do not create new files.

VIOLATIONS TO FIX:
${correctionViolations.map((v, i) => `${i + 1}. ${v}`).join('\n')}

RESTRICTIONS (enforced by harness):
- You may ONLY use the 'edit' tool.
- You may ONLY edit these exact files: ${allowedList}
- The file(s) live at this absolute path in the isolated worktree: ${[...allowedFilesInCorrection].map(f => path.join(WORKTREE, f)).join(', ')}
- No 'write' (new files) allowed.
- Keep changes minimal and targeted to the listed issues.

After making the minimal fixes, stop. The harness will re-evaluate the unit.

Original task context (for reference only): ${baseTask}`;
  }

  return `You are operating under strict constitutional governance (Seatbelt harness).

Core rules (non-negotiable):
- Make small, focused changes only.
- One logical unit of work at a time.
- Avoid god functions and god files — split responsibilities.
- Do not accrete unrelated behavior into existing files.

You have access to write and edit tools. There is no review or "done" tool you call.
The harness (not you) decides when a unit is complete and whether it passes constitutional checks.

Task: ${baseTask}

After you make changes via tools, the harness will automatically evaluate the unit. If there are violations it will put you into correction mode with narrow instructions.`;
}

async function main() {
  console.log('=== Seatbelt Spike 003: Harness-Owned Review Timing ===');
  console.log('Backend:', BACKEND);
  console.log('Worktree:', WORKTREE);
  console.log(`Forcing review after ${FORCED_REVIEW_AFTER_MUTATIONS} mutations (or heuristics)`);
  console.log('review_unit tool: NOT EXPOSED (harness owns timing)');
  console.log('*** VALIDATION RUN: Early forcing (threshold=1) + hardened Codex parser from previous long Task C ***');
  console.log('');

  await ensureWorktree();
  resetUnitTracking();
  resetCorrectionState();
  totalUnitsClosedClean = 0;

  const baseTask = process.env.TASK || 
    "Create a small, clean TypeScript utility for user notification preferences (email, SMS, push). Follow good separation of concerns.";

  console.log('Task:', baseTask.length > 120 ? baseTask.slice(0, 120) + '...' : baseTask);
  console.log('');

  const maxTurns = 25;

  for (let turn = 1; turn <= maxTurns; turn++) {
    console.log(`\n--- Turn ${turn} ---`);
    if (inCorrectionMode) {
      console.log(`[MODE] CORRECTION iteration ${correctionIteration}/${MAX_CORRECTION_ITERATIONS}`);
    } else {
      console.log(`[MODE] NORMAL (open unit: ${mutationsInUnit} mutations so far)`);
    }

    const currentTools = getToolsForCurrentMode();
    const system = buildSystemPrompt(baseTask);

    let response;
    try {
      response = await callImplementer(BACKEND, system, currentTools);
    } catch (e: any) {
      console.error('Implementer error:', e.message);
      break;
    }

    const toolCalls = response.toolCalls || [];

    if (toolCalls.length === 0) {
      console.log(response.text?.slice(0, 300) || '(no tool calls, model output above)');
      // If model claims done and we have a clean unit (or no open mutations), we can exit
      const lower = (response.text || '').toLowerCase();
      if ((lower.includes('done') || lower.includes('finished') || lower.includes('complete')) && mutationsInUnit === 0) {
        console.log('\n[HARNESS] Model signaled completion and no open mutations. Ending run.');
        break;
      }
      // Otherwise continue (model may still be thinking or need another turn)
      continue;
    }

    // Process whatever tool calls we parsed (note: Codex parser currently only grabs last block)
    for (const tc of toolCalls) {
      const result = await handleTool(tc.name, tc.arguments || {});
      console.log(`[Tool] ${tc.name} → ${result}`);

      // After any mutation, the harness immediately considers review
      if (tc.name === 'write' || tc.name === 'edit') {
        const reviewResult = await considerAndEnforceReview();

        if (reviewResult === 'violations' && correctionIteration >= MAX_CORRECTION_ITERATIONS) {
          console.log('\n*** RUN TERMINATED BY HARNESS (max corrections) ***');
          console.log('Final state written to worktree. No self-review escape was used.\n');
          return;
        }

        if (reviewResult === 'clean') {
          // For the one-shot messy creation tasks, a clean unit after correction (or on first good work) is success
          if (process.env.TASK) {
            console.log('\n[HARNESS] Unit closed clean by harness. Task context present — ending validation run.');
            console.log(`Total clean units closed this session: ${totalUnitsClosedClean}`);
            return;
          }
          // For open-ended tasks we could continue; for now we also stop so we get focused traces
          console.log('\n[HARNESS] Clean unit closed. Ending for focused data collection.');
          return;
        }
      }
    }
  }

  console.log('\nReached turn limit or natural end.');
  console.log(`Clean units closed by harness: ${totalUnitsClosedClean}`);
}

main().catch(console.error);
