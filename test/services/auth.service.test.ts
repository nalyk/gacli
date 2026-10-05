import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/oauth.service.js', () => ({
  loadOAuthTokens: vi.fn(),
  saveOAuthTokens: vi.fn(),
}));
vi.mock('../../src/services/config.service.js', () => ({
  getConfig: vi.fn(),
}));

const { loadOAuthTokens } = await import('../../src/services/oauth.service.js');
const { getConfig } = await import('../../src/services/config.service.js');
const auth = await import('../../src/services/auth.service.js');

const mockedLoadTokens = vi.mocked(loadOAuthTokens);
const mockedGetConfig = vi.mocked(getConfig);

describe('auth.service resolution chain', () => {
  beforeEach(() => {
    auth.resetAuth();
    mockedLoadTokens.mockReset();
    mockedGetConfig.mockReset();
    mockedGetConfig.mockReturnValue({});
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GACLI_ACCESS_TOKEN;
    delete process.env.GACLI_SCOPES;
  });

  afterEach(() => {
    auth.resetAuth();
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GACLI_ACCESS_TOKEN;
    delete process.env.GACLI_SCOPES;
  });

  it('priority 1: OAuth tokens win even when service-account env+config are present', () => {
    mockedLoadTokens.mockReturnValue({
      access_token: 'a',
      refresh_token: 'r',
      client_id: 'cid',
      client_secret: 'csec',
      expiry_date: 9999999999999,
      token_type: 'Bearer',
      scope: '',
    });
    mockedGetConfig.mockReturnValue({ credentials: '/path/to/sa.json' });
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/env/sa.json';

    const opts = auth.getAuthClientOptions();
    expect(opts).toHaveProperty('authClient');
    expect(opts).not.toHaveProperty('auth');
    expect(auth.getActiveAuthMode()).toBe('oauth');
  });

  it('priority 2: env var GOOGLE_APPLICATION_CREDENTIALS used when no OAuth tokens and no config', () => {
    mockedLoadTokens.mockReturnValue(null);
    mockedGetConfig.mockReturnValue({});
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/env/sa.json';

    const opts = auth.getAuthClientOptions();
    expect(opts).toHaveProperty('auth');
    expect(opts).not.toHaveProperty('authClient');
    expect(auth.getActiveAuthMode()).toBe('service-account');
  });

  it('priority 3: env var beats config when both are set', () => {
    // resolveCredentialsPath checks env first, so env wins over config.
    mockedLoadTokens.mockReturnValue(null);
    mockedGetConfig.mockReturnValue({ credentials: '/config/sa.json' });
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/env/sa.json';

    expect(auth.resolveCredentialsPath()).toBe('/env/sa.json');
  });

  it('priority 4: config.credentials used when env missing', () => {
    mockedLoadTokens.mockReturnValue(null);
    mockedGetConfig.mockReturnValue({ credentials: '/config/sa.json' });

    expect(auth.resolveCredentialsPath()).toBe('/config/sa.json');
  });

  it('falls back to Application Default Credentials when nothing is configured', () => {
    mockedLoadTokens.mockReturnValue(null);
    mockedGetConfig.mockReturnValue({});

    const opts = auth.getAuthClientOptions() as { auth: { keyFilename?: string } };
    expect(opts).toHaveProperty('auth');
    expect(opts.auth.keyFilename).toBeUndefined();
    expect(auth.describeAuth().source).toBe('adc');
  });

  it('priority 0: GACLI_ACCESS_TOKEN beats OAuth tokens and service accounts', async () => {
    process.env.GACLI_ACCESS_TOKEN = 'ya29.token';
    mockedLoadTokens.mockReturnValue({
      access_token: 'a',
      refresh_token: 'r',
      client_id: 'cid',
      client_secret: 'csec',
      expiry_date: 9999999999999,
      token_type: 'Bearer',
      scope: '',
    });
    const opts = auth.getAuthClientOptions() as {
      authClient: { credentials: { access_token?: string; refresh_token?: string } };
    };
    expect(opts.authClient.credentials.access_token).toBe('ya29.token');
    expect(opts.authClient.credentials.refresh_token).toBeUndefined();
    expect(auth.describeAuth().source).toBe('access-token');
    expect(await auth.getAccessToken()).toBe('ya29.token');
  });

  it('describes each credential source', () => {
    mockedLoadTokens.mockReturnValue(null);
    mockedGetConfig.mockReturnValue({ credentials: '/config/sa.json' });
    expect(auth.describeAuth()).toEqual({ source: 'config-credentials', detail: '/config/sa.json' });
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/env/sa.json';
    expect(auth.describeAuth()).toEqual({ source: 'env-credentials', detail: '/env/sa.json' });
  });

  it('maps scope presets', () => {
    const R = 'https://www.googleapis.com/auth/analytics.readonly';
    const E = 'https://www.googleapis.com/auth/analytics.edit';
    const C = 'https://www.googleapis.com/auth/analytics.chatbot.read';
    expect(auth.scopesFor('readonly')).toEqual([R]);
    expect(auth.scopesFor('edit')).toEqual([R, E]);
    expect(auth.scopesFor('chat')).toEqual([R, E, C]);
  });

  it('adds the chatbot scope for service accounts when GACLI_SCOPES=chat', () => {
    mockedLoadTokens.mockReturnValue(null);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/env/sa.json';
    process.env.GACLI_SCOPES = 'chat';
    const opts = auth.getAuthClientOptions() as { auth: { scopes: string[] } };
    expect(opts.auth.scopes).toContain('https://www.googleapis.com/auth/analytics.chatbot.read');
  });

  it('caches resolved options across calls (singleton)', () => {
    mockedLoadTokens.mockReturnValue({
      access_token: 'a',
      refresh_token: 'r',
      client_id: 'cid',
      client_secret: 'csec',
      expiry_date: 9999999999999,
      token_type: 'Bearer',
      scope: '',
    });

    const a = auth.getAuthClientOptions();
    const b = auth.getAuthClientOptions();
    expect(a).toBe(b);
    expect(mockedLoadTokens).toHaveBeenCalledTimes(1);
  });

  it('resetAuth() clears the cache so a new call re-resolves', () => {
    mockedLoadTokens.mockReturnValue({
      access_token: 'a',
      refresh_token: 'r',
      client_id: 'cid',
      client_secret: 'csec',
      expiry_date: 9999999999999,
      token_type: 'Bearer',
      scope: '',
    });

    auth.getAuthClientOptions();
    auth.resetAuth();
    auth.getAuthClientOptions();
    expect(mockedLoadTokens).toHaveBeenCalledTimes(2);
  });

  it('getActiveAuthMode returns service-account when no tokens are present', () => {
    mockedLoadTokens.mockReturnValue(null);
    expect(auth.getActiveAuthMode()).toBe('service-account');
  });

  it('exports the expected GA4 OAuth scopes', () => {
    expect(auth.GA4_SCOPES).toEqual([
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/analytics.edit',
    ]);
  });
});
