import { homedir } from 'node:os';
import { join } from 'node:path';
import type { OutputFormat } from './common.js';

export const CONFIG_DIR = join(homedir(), '.gacli');
export const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface CLIConfig {
  credentials?: string;
  property?: string;
  format?: OutputFormat;
  noColor?: boolean;
  verbose?: boolean;
  oauthClientSecretFile?: string;
}

export const CONFIG_KEYS: Record<string, string> = {
  credentials: 'Path to Google service account credentials JSON file',
  property: 'Default GA4 property ID',
  format: 'Default output format (table|json|ndjson|csv|chart)',
  noColor: 'Disable colored output (true|false)',
  verbose: 'Enable verbose logging (true|false)',
  oauthClientSecretFile: 'Path to OAuth client secret JSON file',
};
