import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { CLIConfig, CONFIG_DIR, CONFIG_FILE, CONFIG_KEYS } from '../types/config.js';

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function getConfig(): CLIConfig {
  try {
    if (existsSync(CONFIG_FILE)) {
      const raw = readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(raw) as CLIConfig;
    }
  } catch {
    // Ignore invalid config
  }
  return {};
}

export function setConfigValue(key: string, value: string): void {
  if (!(key in CONFIG_KEYS)) {
    throw new Error(`Unknown config key: ${key}. Valid keys: ${Object.keys(CONFIG_KEYS).join(', ')}`);
  }
  ensureConfigDir();
  const config = getConfig();

  if (key === 'noColor' || key === 'verbose') {
    (config as Record<string, unknown>)[key] = value === 'true';
  } else {
    (config as Record<string, unknown>)[key] = value;
  }

  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function getConfigValue(key: string): string | undefined {
  const config = getConfig();
  const value = (config as Record<string, unknown>)[key];
  return value !== undefined ? String(value) : undefined;
}

export function listConfig(): CLIConfig {
  return getConfig();
}
