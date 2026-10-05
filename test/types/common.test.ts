import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/config.service.js', () => ({
  getConfig: vi.fn(),
}));

const { getConfig } = await import('../../src/services/config.service.js');
const { addGlobalOptions, resolveGlobalOptions } = await import('../../src/types/common.js');
const mockedGetConfig = vi.mocked(getConfig);

function globalsFrom(args: string[]) {
  const program = addGlobalOptions(new Command().exitOverride());
  let captured: ReturnType<typeof resolveGlobalOptions> | undefined;
  program.addCommand(
    new Command('x').action((_opts, command) => {
      captured = resolveGlobalOptions(command);
    }),
  );
  program.parse(['node', 'gacli', ...args, 'x']);
  return captured;
}

const AGENT_VARS = [
  'CLAUDECODE',
  'CODEX_THREAD_ID',
  'CURSOR_AGENT',
  'AI_AGENT',
  'GACLI_AGENT',
  'CI',
  'GACLI_FORMAT',
];

function setStdoutTTY(value: boolean) {
  Object.defineProperty(process.stdout, 'isTTY', { value, configurable: true });
}

const originalTTY = process.stdout.isTTY;

beforeEach(() => {
  for (const v of AGENT_VARS) vi.stubEnv(v, '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  setStdoutTTY(originalTTY);
});

describe('resolveGlobalOptions format', () => {
  beforeEach(() => mockedGetConfig.mockReturnValue({}));

  it('rejects an unknown --format', () => {
    expect(() => globalsFrom(['-f', 'xml'])).toThrow(
      'Invalid format "xml". Valid: table, json, ndjson, csv, chart',
    );
  });

  it('accepts ndjson', () => {
    expect(globalsFrom(['-f', 'ndjson'])?.format).toBe('ndjson');
  });

  it('uses the configured format when no flag is given', () => {
    mockedGetConfig.mockReturnValue({ format: 'json' });
    expect(globalsFrom([])?.format).toBe('json');
  });

  it('warns and falls back to table when the configured format is invalid', async () => {
    const { logger } = await import('../../src/utils/logger.js');
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    setStdoutTTY(true);
    mockedGetConfig.mockReturnValue({ format: 'xml' as never });
    expect(globalsFrom([])?.format).toBe('table');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Ignoring invalid config format "xml"'));
  });

  it('defaults to table on an interactive terminal', () => {
    setStdoutTTY(true);
    expect(globalsFrom([])?.format).toBe('table');
  });

  it('defaults to json when stdout is not a TTY', () => {
    setStdoutTTY(false);
    expect(globalsFrom([])?.format).toBe('json');
  });

  it('defaults to json when an agent is detected, even on a TTY', () => {
    setStdoutTTY(true);
    vi.stubEnv('CLAUDECODE', '1');
    const g = globalsFrom([]);
    expect(g?.format).toBe('json');
    expect(g?.agent).toBe('claude-code');
  });

  it('GACLI_FORMAT beats config', () => {
    vi.stubEnv('GACLI_FORMAT', 'csv');
    mockedGetConfig.mockReturnValue({ format: 'json' });
    expect(globalsFrom([])?.format).toBe('csv');
  });

  it('an explicit -f beats GACLI_FORMAT and records it', () => {
    vi.stubEnv('GACLI_FORMAT', 'csv');
    const g = globalsFrom(['-f', 'ndjson']);
    expect(g?.format).toBe('ndjson');
    expect(g?.formatExplicit).toBe(true);
  });
});

describe('resolveGlobalOptions noColor', () => {
  beforeEach(() => mockedGetConfig.mockReturnValue({}));

  it('--no-color sets noColor', () => {
    expect(globalsFrom(['--no-color'])?.noColor).toBe(true);
  });

  it('falls back to config noColor when the flag is absent', () => {
    mockedGetConfig.mockReturnValue({ noColor: true });
    expect(globalsFrom([])?.noColor).toBe(true);
  });

  it('defaults to colour on', () => {
    expect(globalsFrom([])?.noColor).toBe(false);
  });
});
