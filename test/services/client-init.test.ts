import { afterEach, describe, expect, it, vi } from 'vitest';

// A bad keyfile used to surface as an unhandled rejection from gax's per-method stub promises,
// which kills a long-running MCP server. Credentials must fail on the awaited path instead.
describe('API clients with unusable credentials', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  for (const [label, load] of [
    ['admin', async () => (await import('../../src/services/admin-api.service.js')).getAdminClient()],
    ['data', async () => (await import('../../src/services/data-api.service.js')).getMetadata('1')],
  ] as const) {
    it(`${label}: rejects on the awaited call and leaves no unhandled rejection`, async () => {
      vi.stubEnv('GOOGLE_APPLICATION_CREDENTIALS', '/nonexistent/sa.json');
      vi.stubEnv('GACLI_ACCESS_TOKEN', '');
      vi.stubEnv('HOME', '/nonexistent-home');
      vi.stubEnv('GACLI_MAX_RETRIES', '0');
      vi.resetModules();
      const unhandled: unknown[] = [];
      const onUnhandled = (reason: unknown) => unhandled.push(reason);
      process.on('unhandledRejection', onUnhandled);
      try {
        await expect(load()).rejects.toThrow(/ENOENT|no such file/);
        await expect(load()).rejects.toMatchObject({ kind: 'auth' });
        await new Promise((r) => setTimeout(r, 200));
        expect(unhandled).toEqual([]);
      } finally {
        process.off('unhandledRejection', onUnhandled);
      }
    });
  }
});
