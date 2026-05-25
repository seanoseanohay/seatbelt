export interface ConstitutionRule {
  id: string;
  description: string;
  check: (context: ReviewContext) => Violation | null;
}

export interface Violation {
  ruleId: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ReviewContext {
  filesChanged: string[];
  linesChanged: number;
  touchedHighRiskFiles: string[];
  fileContents: Map<string, string>; // path -> content
}

export interface ReviewResult {
  violations: Violation[];
  isClean: boolean;
}

export interface CorrectionState {
  active: boolean;
  iteration: number;
  maxIterations: number;
  violations: Violation[];
  allowedFiles: Set<string>;
}

export interface HarnessOptions {
  worktree: string;
  constitution?: ConstitutionRule[];
  maxCorrectionIterations?: number;
  forcedReviewAfterMutations?: number;
}