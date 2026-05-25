import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export interface SeatbeltConfig {
  // Legacy / current auditor tuning
  auditor?: {
    maxLinesPerChange?: number;
    maxFilesPerChange?: number;
    highRiskPatterns?: string[];
  };

  // Prompt customization (from Slice 1)
  prompt?: {
    strictness?: 'default' | 'strict';
  };

  /**
   * Constitutional rule groups.
   * When a group is set to false, the harness will:
   * - Soften or remove the corresponding language from the system prompt the model receives
   * - Relax the corresponding checks in the Auditor
   *
   * This is the foundation for selectable Pragmatic Programmer lessons and
   * targeted repair passes ("fix only these specific rule violations").
   */
  rules?: {
    /** Emphasize making the smallest possible focused changes. */
    smallFocusedChanges?: boolean;

    /** Strongly discourage god files and god functions. */
    avoidGodFiles?: boolean;

    /** Discourage accretion on high-risk files (manager, service, core, etc.). */
    highRiskAccretion?: boolean;
  };
}

const DEFAULT_CONFIG: Required<SeatbeltConfig> = {
  auditor: {
    maxLinesPerChange: 60,
    maxFilesPerChange: 2,
    highRiskPatterns: ['service', 'index', 'main', 'app', 'core', 'manager', 'util'],
  },
  prompt: {
    strictness: 'default',
  },
  rules: {
    smallFocusedChanges: true,
    avoidGodFiles: true,
    highRiskAccretion: true,
  },
};

export async function loadConfig(worktreePath: string): Promise<Required<SeatbeltConfig>> {
  const configPath = path.join(worktreePath, '.seatbelt', 'config.json');

  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const raw = await readFile(configPath, 'utf-8');
    const userConfig = JSON.parse(raw) as SeatbeltConfig;

    return {
      auditor: {
        maxLinesPerChange: userConfig.auditor?.maxLinesPerChange ?? DEFAULT_CONFIG.auditor.maxLinesPerChange,
        maxFilesPerChange: userConfig.auditor?.maxFilesPerChange ?? DEFAULT_CONFIG.auditor.maxFilesPerChange,
        highRiskPatterns: userConfig.auditor?.highRiskPatterns ?? DEFAULT_CONFIG.auditor.highRiskPatterns,
      },
      prompt: {
        strictness: userConfig.prompt?.strictness ?? DEFAULT_CONFIG.prompt.strictness,
      },
      rules: {
        smallFocusedChanges: userConfig.rules?.smallFocusedChanges ?? DEFAULT_CONFIG.rules.smallFocusedChanges,
        avoidGodFiles: userConfig.rules?.avoidGodFiles ?? DEFAULT_CONFIG.rules.avoidGodFiles,
        highRiskAccretion: userConfig.rules?.highRiskAccretion ?? DEFAULT_CONFIG.rules.highRiskAccretion,
      },
    };
  } catch {
    console.warn(`[Seatbelt] Failed to load .seatbelt/config.json — using defaults`);
    return DEFAULT_CONFIG;
  }
}

export { DEFAULT_CONFIG };
