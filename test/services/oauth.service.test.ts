import { chmodSync, mkdirSync, mkdtempSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const posix = process.platform !== 'win32';

describe('oauth.service token persistence', () => {
  let home: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'gacli-home-'));
    vi.stubEnv('HOME', home);
    vi.resetModules();
  });

  afterEach(() => vi.unstubAllEnvs());

  it.runIf(posix)('re-tightens a pre-existing world-readable token file and config dir', async () => {
    const dir = join(home, '.gacli');
    const file = join(dir, 'oauth-tokens.json');
    mkdirSync(dir, { mode: 0o755 });
    chmodSync(dir, 0o755);
    writeFileSync(file, '{}', { mode: 0o644 });
    chmodSync(file, 0o644);

    const { saveOAuthTokens } = await import('../../src/services/oauth.service.js');
    saveOAuthTokens({
      access_token: 'a',
      refresh_token: 'r',
      client_id: 'c',
      client_secret: 's',
      expiry_date: 1,
      token_type: 'Bearer',
      scope: '',
    });

    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect(statSync(dir).mode & 0o777).toBe(0o700);
  });
});
