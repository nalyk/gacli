import { Command } from 'commander';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    mockedGetConfig.mockReturnValue({ format: 'xml' as never });
    expect(globalsFrom([])?.format).toBe('table');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Ignoring invalid config format "xml"'));
  });

  it('defaults to table', () => {
    expect(globalsFrom([])?.format).toBe('table');
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
