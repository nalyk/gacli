import { type CLIConfig, CONFIG_DIR, CONFIG_FILE, CONFIG_KEYS } from '../types/config.js';
import { ensureSecureDir, readJsonFile, writeFileAtomic } from '../utils/secure-fs.js';

export function ensureConfigDir(): void {
  ensureSecureDir(CONFIG_DIR);
}

export function getConfig(): CLIConfig {
  return readJsonFile<CLIConfig>(CONFIG_FILE, 'config') ?? {};
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

  writeFileAtomic(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function getConfigValue(key: string): string | undefined {
  const config = getConfig();
  const value = (config as Record<string, unknown>)[key];
  return value !== undefined ? String(value) : undefined;
}

export function listConfig(): CLIConfig {
  return getConfig();
}
