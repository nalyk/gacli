import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('setConfigValue', () => {
  beforeEach(() => {
    vi.stubEnv('HOME', mkdtempSync(join(tmpdir(), 'gacli-home-')));
    vi.resetModules();
  });

  afterEach(() => vi.unstubAllEnvs());

  it('rejects an invalid format value', async () => {
    const { setConfigValue } = await import('../../src/services/config.service.js');
    expect(() => setConfigValue('format', 'xml')).toThrow(
      'Invalid format "xml". Valid: table, json, ndjson, csv, chart',
    );
  });

  it('accepts a valid format value', async () => {
    const { setConfigValue, getConfigValue } = await import('../../src/services/config.service.js');
    setConfigValue('format', 'ndjson');
    expect(getConfigValue('format')).toBe('ndjson');
  });
});
