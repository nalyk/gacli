import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { GacliError } from '../core/errors.js';
import { getConfig } from './config.service.js';
import { loadOAuthTokens, saveOAuthTokens } from './oauth.service.js';

export const GA4_SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/analytics.edit',
];

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
  if (!keyFile) {
    throw new Error(
      'No credentials configured. Run `gacli auth login` for OAuth or set a service account via:\n' +
        '  gacli config set credentials /path/to/service-account.json',
    );
  }
  const auth = new GoogleAuth({ keyFile, scopes: GA4_SCOPES });
  cachedAuthOptions = { auth };
  return cachedAuthOptions;
}

export function getActiveAuthMode(): 'oauth' | 'service-account' {
  const tokens = loadOAuthTokens();
  return tokens ? 'oauth' : 'service-account';
}

let credentialsReady: Promise<void> | null = null;

/**
 * Load key files / ADC up front. gax builds one promise per RPC from a shared setup promise and only
 * the called one is awaited, so a credential failure inside the SDK becomes an unhandled rejection
 * (which kills a long-running MCP server). Failing here keeps it on the awaited path.
 */
export function ensureCredentials(): Promise<void> {
  if (!credentialsReady) {
    const opts = getAuthClientOptions();
    const ready =
      'auth' in opts
        ? opts.auth.getClient().then(
            () => undefined,
            (err: unknown) => {
              // ADC's own "Could not load the default credentials" keeps its dedicated mapping in toGacliError.
              if (err instanceof Error && err.message.startsWith('Could not load the default credentials'))
                throw err;
              throw new GacliError(
                'auth',
                `Cannot load credentials: ${err instanceof Error ? err.message : String(err)}`,
                {
                  cause: err,
                  hint: 'Check GOOGLE_APPLICATION_CREDENTIALS / `gacli config get credentials`, or run `gacli auth login`.',
                },
              );
            },
          )
        : Promise.resolve();
    credentialsReady = ready;
    ready.catch(() => {
      if (credentialsReady === ready) credentialsReady = null;
    });
  }
  return credentialsReady;
}

export function resetAuth(): void {
  credentialsReady = null;
  cachedAuthOptions = null;
}
