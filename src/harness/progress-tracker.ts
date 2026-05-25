/**
 * ProgressTracker
 *
 * Encapsulates all the state and logic for deciding when to terminate
 * a run (especially in one-shot mode) based on model activity and repetition.
 *
 * Extracted from SeatbeltRunner to improve SRP and make the logic
 * independently testable and reusable for future phased behavior.
 */
export class ProgressTracker {
  private consecutiveNoToolCalls = 0;
  private hasMadeMutation = false;
  private turnsSinceLastMutation = 0;
  private totalMutations = 0;
  private lastMutatedFile: string | null = null;
  private lastFileContent: string | null = null;
  private consecutiveSameFileMutations = 0;

  /**
   * Call this whenever the model successfully performs a write or edit.
   */
  recordMutation(filePath: string, content: string): void {
    this.hasMadeMutation = true;
    this.turnsSinceLastMutation = 0;
    this.totalMutations++;

    if (this.lastMutatedFile === filePath) {
      const isIdentical = this.lastFileContent === content;
      this.consecutiveSameFileMutations += isIdentical ? 2 : 1;
    } else {
      this.consecutiveSameFileMutations = 1;
      this.lastMutatedFile = filePath;
    }

    this.lastFileContent = content;
  }

  /**
   * Call this whenever the model produces a turn with zero tool calls.
   */
  recordNoToolCall(): void {
    this.consecutiveNoToolCalls++;
    if (this.hasMadeMutation) {
      this.turnsSinceLastMutation++;
    }
  }

  /**
   * Call this at the start of every turn to track passage of time
   * (used for inactivity-based early exit after work has been done).
   */
  recordTimeAdvanced(): void {
    if (this.hasMadeMutation) {
      this.turnsSinceLastMutation++;
    }
  }

  /**
   * Call this after processing a turn that *did* produce tool calls
   * (resets the no-tool counter).
   */
  recordToolCallsReceived(): void {
    this.consecutiveNoToolCalls = 0;
  }

  // --- Decision methods ---

  shouldExitDueToNoToolCalls(): boolean {
    return this.consecutiveNoToolCalls >= 3;
  }

  shouldExitDueToInactivityAfterWork(): boolean {
    return this.hasMadeMutation && this.turnsSinceLastMutation >= 2;
  }

  shouldExitDueToTooManyMutationsWithoutCorrection(): boolean {
    return this.hasMadeMutation && this.totalMutations >= 5;
  }

  shouldExitDueToRepeatedSameFile(): boolean {
    return this.consecutiveSameFileMutations >= 3;
  }

  // --- Utility ---

  getTotalMutations(): number {
    return this.totalMutations;
  }

  isStuckOnSameFile(): boolean {
    return this.consecutiveSameFileMutations >= 2;
  }

  reset(): void {
    this.consecutiveNoToolCalls = 0;
    this.hasMadeMutation = false;
    this.turnsSinceLastMutation = 0;
    this.totalMutations = 0;
    this.lastMutatedFile = null;
    this.lastFileContent = null;
    this.consecutiveSameFileMutations = 0;
  }
}
