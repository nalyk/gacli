import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/auth.service.js', async (orig) => ({
  ...(await orig<typeof import('../../src/services/auth.service.js')>()),
  describeAuth: vi.fn(() => ({ source: 'env-credentials', detail: '/sa.json' })),
  getAccessToken: vi.fn(async () => 'ya29.abc'),
}));
vi.mock('../../src/services/config.service.js', () => ({ getConfig: vi.fn(() => ({})) }));

const { createAuthCommand } = await import('../../src/commands/auth/index.js');
const { addGlobalOptions } = await import('../../src/types/common.js');

let stdout: string[];

async function run(...args: string[]) {
  const program = addGlobalOptions(new Command('gacli')).exitOverride();
  program.addCommand(createAuthCommand());
  await program.parseAsync(['node', 'gacli', ...args]);
}

beforeEach(() => {
  stdout = [];
  vi.spyOn(console, 'log').mockImplementation((m: unknown) => {
    stdout.push(String(m));
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('auth commands', () => {
  it('auth token prints only the access token on stdout', async () => {
    await run('auth', 'token');
    expect(stdout).toEqual(['ya29.abc']);
  });

  it('auth status -f json prints the resolved source', async () => {
    await run('-f', 'json', 'auth', 'status');
    expect(JSON.parse(stdout[0])).toMatchObject({ source: 'env-credentials', credentialsFile: '/sa.json' });
  });

  it('auth login accepts --scopes readonly|edit|chat', () => {
    const login = createAuthCommand().commands.find((c) => c.name() === 'login');
    const scopes = login?.options.find((o) => o.long === '--scopes');
    expect(scopes?.argChoices).toEqual(['readonly', 'edit', 'chat']);
    expect(scopes?.defaultValue).toBe('edit');
  });
});
