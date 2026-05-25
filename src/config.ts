import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export interface SeatbeltConfig {
  auditor?: {
    maxLinesPerChange?: number;
    maxFilesPerChange?: number;
    highRiskPatterns?: string[];
  };
}

const DEFAULT_CONFIG: Required<SeatbeltConfig> = {
  auditor: {
    maxLinesPerChange: 60,
    maxFilesPerChange: 2,
    highRiskPatterns: ['service', 'index', 'main', 'app', 'core', 'manager', 'util'],
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
    };
  } catch {
    console.warn(`[Seatbelt] Failed to load .seatbelt/config.json — using defaults`);
    return DEFAULT_CONFIG;
  }
}

export { DEFAULT_CONFIG };
