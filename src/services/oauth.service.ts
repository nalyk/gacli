import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import type { StoredOAuthTokens, OAuthClientSecrets } from '../types/oauth.js';
import { OAUTH_TOKENS_FILE } from '../types/oauth.js';
import { ensureConfigDir } from './config.service.js';

export function loadOAuthTokens(): StoredOAuthTokens | null {
  try {
    if (!existsSync(OAUTH_TOKENS_FILE)) return null;
    const raw = readFileSync(OAUTH_TOKENS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.access_token || !parsed.refresh_token || !parsed.client_id || !parsed.client_secret) {
      return null;
    }
    return parsed as StoredOAuthTokens;
  } catch {
    return null;
  }
}

export function saveOAuthTokens(tokens: StoredOAuthTokens): void {
  ensureConfigDir();
  writeFileSync(OAUTH_TOKENS_FILE, JSON.stringify(tokens, null, 2), { encoding: 'utf-8', mode: 0o600 });
}

export function deleteOAuthTokens(): boolean {
  try {
    if (existsSync(OAUTH_TOKENS_FILE)) {
      unlinkSync(OAUTH_TOKENS_FILE);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function loadClientSecrets(filePath: string): OAuthClientSecrets {
  if (!existsSync(filePath)) {
    throw new Error(`Client secret file not found: ${filePath}`);
  }
  const raw = readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!parsed.installed?.client_id || !parsed.installed?.client_secret) {
    throw new Error('Invalid client secret file. Expected "installed" application type with client_id and client_secret.');
  }
  return parsed as OAuthClientSecrets;
}
