import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { getConfig } from './config.service.js';
import { loadOAuthTokens, saveOAuthTokens } from './oauth.service.js';

const READONLY_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const EDIT_SCOPE = 'https://www.googleapis.com/auth/analytics.edit';
const CHAT_SCOPE = 'https://www.googleapis.com/auth/analytics.chatbot.read';

export const GA4_SCOPES = [READONLY_SCOPE, EDIT_SCOPE];

export type ScopePreset = 'readonly' | 'edit' | 'chat';

export function scopesFor(preset: ScopePreset): string[] {
  if (preset === 'readonly') return [READONLY_SCOPE];
  return preset === 'chat' ? [...GA4_SCOPES, CHAT_SCOPE] : GA4_SCOPES;
}

// Service accounts have no consent screen, so the chatbot scope is opt-in via env.
const serviceScopes = () => scopesFor(process.env.GACLI_SCOPES === 'chat' ? 'chat' : 'edit');

export type AuthSource = 'access-token' | 'oauth' | 'env-credentials' | 'config-credentials' | 'adc';

/** Which credential the resolution chain will use, without touching the network. */
export function describeAuth(): { source: AuthSource; detail?: string } {
  if (process.env.GACLI_ACCESS_TOKEN) return { source: 'access-token' };
  if (loadOAuthTokens()) return { source: 'oauth' };
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return { source: 'env-credentials', detail: process.env.GOOGLE_APPLICATION_CREDENTIALS };
  }
  const configured = getConfig().credentials;
  if (configured) return { source: 'config-credentials', detail: configured };
  return { source: 'adc' };
}

export function resolveCredentialsPath(): string | undefined {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  const config = getConfig();
  if (config.credentials) {
    return config.credentials;
  }
  return undefined;
}

let cachedAuthOptions: { authClient: OAuth2Client } | { auth: GoogleAuth } | null = null;

export function getAuthClientOptions(): { authClient: OAuth2Client } | { auth: GoogleAuth } {
  if (cachedAuthOptions) return cachedAuthOptions;

  // Agents/CI: a pre-obtained access token, used as-is (no refresh; expiry surfaces as exit 3).
  const accessToken = process.env.GACLI_ACCESS_TOKEN;
  if (accessToken) {
    const client = new OAuth2Client();
    client.setCredentials({ access_token: accessToken });
    cachedAuthOptions = { authClient: client };
    return cachedAuthOptions;
  }

  const tokens = loadOAuthTokens();
  if (tokens) {
    const oauth2Client = new OAuth2Client({
      clientId: tokens.client_id,
      clientSecret: tokens.client_secret,
    });
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      token_type: tokens.token_type,
    });
    oauth2Client.on('tokens', (newTokens) => {
      saveOAuthTokens({
        access_token: newTokens.access_token ?? tokens.access_token,
        refresh_token: newTokens.refresh_token ?? tokens.refresh_token,
        expiry_date: newTokens.expiry_date ?? tokens.expiry_date,
        token_type: newTokens.token_type ?? tokens.token_type,
        scope: newTokens.scope ?? tokens.scope,
        client_id: tokens.client_id,
        client_secret: tokens.client_secret,
      });
    });
    cachedAuthOptions = { authClient: oauth2Client };
    return cachedAuthOptions;
  }

  const keyFile = resolveCredentialsPath();
  // No keyFile → Application Default Credentials (gcloud auth application-default login, GCE/GKE metadata).
  const auth = keyFile
    ? new GoogleAuth({ keyFile, scopes: serviceScopes() })
    : new GoogleAuth({ scopes: serviceScopes() });
  cachedAuthOptions = { auth };
  return cachedAuthOptions;
}

export function getActiveAuthMode(): 'oauth' | 'service-account' {
  const tokens = loadOAuthTokens();
  return tokens ? 'oauth' : 'service-account';
}

export async function getAccessToken(): Promise<string> {
  const opts = getAuthClientOptions();
  const result =
    'authClient' in opts ? await opts.authClient.getAccessToken() : await opts.auth.getAccessToken();
  const token = typeof result === 'string' ? result : result?.token;
  if (!token) throw new Error('No credentials configured: could not obtain an access token');
  return token;
}

export function resetAuth(): void {
  cachedAuthOptions = null;
}
