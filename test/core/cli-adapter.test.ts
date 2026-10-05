import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('../../src/services/config.service.js', () => ({ getConfig: vi.fn(() => ({})) }));

const { defineOperation } = await import('../../src/core/operation.js');
const { mountOperations, finalizeProgram, runProgram } = await import('../../src/core/cli-adapter.js');
const { addGlobalOptions } = await import('../../src/types/common.js');
const { setJsonErrors } = await import('../../src/core/errors.js');

class ExitCalled extends Error {
  constructor(public exitCode: number | undefined) {
    super(`exit ${exitCode}`);
  }
}

const readRun = vi.fn();
const deleteRun = vi.fn();
const createRun = vi.fn();

const readOp = defineOperation({
  id: 'demo.things.list',
  summary: 'List things',
  category: 'read',
  kind: 'resource',
  needsProperty: true,
  input: z.object({
    metrics: z.array(z.string()).min(1).describe('Metrics to fetch'),
    limit: z.coerce.number().int().positive().optional().describe('Max rows'),
    startDate: z.string().default('7daysAgo').describe('Start date'),
  }),
  flags: { metrics: '-m, --metrics <metrics...>' },
  output: z.array(z.object({ id: z.string() })),
  run: async (input, ctx) => readRun(input, ctx),
});

const deleteOp = defineOperation({
  id: 'demo.things.delete',
  summary: 'Delete a thing',
  category: 'delete',
  kind: 'resource',
  input: z.object({ name: z.string().min(1).describe('Resource name') }),
  flags: { name: '--name <resourceName>' },
  output: z.object({ name: z.string(), deleted: z.boolean() }),
  run: async (input) => deleteRun(input),
});

const createOp = defineOperation({
  id: 'demo.things.create',
  summary: 'Create a thing',
  category: 'create',
  kind: 'resource',
  input: z.object({ displayName: z.string() }),
  output: z.object({ name: z.string() }),
  run: async (input) => createRun(input),
});

let stdout: string[];
let stderr: string[];
// A real process.exit never returns; the stub throws, which can re-enter handleError upstream,
// so only the first recorded exit code is meaningful.
let exits: number[];

function build() {
  const program = addGlobalOptions(new Command('gacli'));
  mountOperations(program, [readOp, deleteOp, createOp]);
  finalizeProgram(program);
  return program;
}

async function cli(...args: string[]): Promise<number> {
  try {
    await runProgram(build(), ['node', 'gacli', ...args]);
  } catch (e) {
    if (!(e instanceof ExitCalled)) throw e;
  }
  return exits[0] ?? 0;
}

beforeEach(() => {
  stdout = [];
  stderr = [];
  exits = [];
  for (const v of [
    'CLAUDECODE',
    'CODEX_THREAD_ID',
    'CURSOR_AGENT',
    'AI_AGENT',
    'GACLI_AGENT',
    'CI',
    'GACLI_FORMAT',
  ]) {
    vi.stubEnv(v, '');
  }
  readRun.mockReset().mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
  deleteRun.mockReset().mockResolvedValue({ name: 'x', deleted: true });
  createRun.mockReset().mockResolvedValue({ name: 'new' });
  vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    exits.push(code ?? 0);
    throw new ExitCalled(code);
  }) as never);
  vi.spyOn(console, 'log').mockImplementation((m: unknown) => {
    stdout.push(String(m));
  });
  vi.spyOn(console, 'error').mockImplementation((m: unknown) => {
    stderr.push(String(m));
  });
  vi.spyOn(process.stderr, 'write').mockImplementation(((m: string) => {
    stderr.push(String(m));
    return true;
  }) as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  setJsonErrors(false);
});

describe('mountOperations', () => {
  it('parses typed input and passes the property in the context', async () => {
    expect(
      await cli('-p', '123', '-f', 'json', 'demo', 'things', 'list', '-m', 'sessions', '--limit', '5'),
    ).toBe(0);
    expect(readRun).toHaveBeenCalledTimes(1);
    const [input, ctx] = readRun.mock.calls[0];
    expect(input).toEqual({ metrics: ['sessions'], limit: 5, startDate: '7daysAgo' });
    expect(ctx.property).toBe('123');
    expect(JSON.parse(stdout[0]).rowCount).toBe(2);
  });

  it('rejects a non-numeric --limit with exit 2 and does not call the API', async () => {
    expect(await cli('-p', '1', 'demo', 'things', 'list', '-m', 's', '--limit', 'abc')).toBe(2);
    expect(readRun).not.toHaveBeenCalled();
  });

  it('rejects a missing required option with exit 2', async () => {
    expect(await cli('-p', '1', 'demo', 'things', 'list')).toBe(2);
  });

  it('rejects an unknown option with exit 2', async () => {
    expect(await cli('-p', '1', 'demo', 'things', 'list', '-m', 's', '--bogus')).toBe(2);
  });

  it('requires a property for needsProperty operations', async () => {
    vi.stubEnv('GA4_PROPERTY_ID', '');
    expect(await cli('demo', 'things', 'list', '-m', 's')).toBe(2);
  });

  it('refuses a delete without --yes when not interactive (exit 4) and prints the re-run hint', async () => {
    expect(await cli('-f', 'json', 'demo', 'things', 'delete', '--name', 'x')).toBe(4);
    expect(deleteRun).not.toHaveBeenCalled();
    const err = JSON.parse(stderr[0]);
    expect(err.error.code).toBe('CONFIRMATION');
    expect(err.error.hint).toContain('--yes');
  });

  it('runs a delete with --yes or --force', async () => {
    expect(await cli('demo', 'things', 'delete', '--name', 'x', '--yes')).toBe(0);
    expect(await cli('demo', 'things', 'delete', '--name', 'x', '--force')).toBe(0);
    expect(deleteRun).toHaveBeenCalledTimes(2);
  });

  it('--dry-run prints the request and does not call the API', async () => {
    expect(await cli('-f', 'json', 'demo', 'things', 'create', '--display-name', 'Plan', '--dry-run')).toBe(
      0,
    );
    expect(createRun).not.toHaveBeenCalled();
    const out = JSON.parse(stdout[0]);
    expect(out).toMatchObject({
      dryRun: true,
      operation: 'demo.things.create',
      input: { displayName: 'Plan' },
    });
  });

  it('does not add --dry-run to read operations', () => {
    const list = build()
      .commands.find((c) => c.name() === 'demo')
      ?.commands[0].commands.find((c) => c.name() === 'list');
    expect(list?.options.map((o) => o.long)).not.toContain('--dry-run');
    expect(list?.options.map((o) => o.long)).toContain('--fields');
  });

  it('applies --fields', async () => {
    expect(await cli('-p', '1', '-f', 'json', 'demo', 'things', 'list', '-m', 's', '--fields', 'id')).toBe(0);
    expect(JSON.parse(stdout[0]).data).toEqual([{ id: 'a' }, { id: 'b' }]);
  });

  it('throws at mount time on a duplicate command path', () => {
    const program = new Command('gacli');
    expect(() => mountOperations(program, [readOp, readOp])).toThrow(
      'Duplicate command path: demo things list',
    );
  });

  it('exits 0 for --help', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation((() => true) as never);
    expect(await cli('demo', 'things', 'list', '--help')).toBe(0);
  });

  it('names the flag (not the input key) in usage errors, without a doubled ✖', async () => {
    expect(await cli('-p', '1', '-f', 'table', 'demo', 'things', 'list', '-m', 's', '--limit', 'abc')).toBe(
      2,
    );
    const text = stderr.join('\n');
    expect(text).toContain('--limit');
    expect(text).not.toContain('✖ ✖');
  });

  it('reports an invalid -f as a JSON error when stdout is piped', async () => {
    expect(await cli('-p', '1', '-f', 'xml', 'demo', 'things', 'list', '-m', 's')).toBe(2);
    expect(JSON.parse(stderr[0]).error.code).toBe('USAGE');
  });
});

describe('mountOperations flag generation edge cases', () => {
  it('rejects input keys that clash with injected flags', () => {
    const bad = defineOperation({
      id: 'demo.bad.list',
      summary: 'x',
      category: 'read',
      kind: 'resource',
      input: z.object({ fields: z.string().optional() }),
      output: z.unknown(),
      run: async () => [],
    });
    expect(() => mountOperations(new Command('gacli'), [bad])).toThrow(/reserved/);
  });

  it('gives a boolean defaulting to true a --no- flag', async () => {
    const run = vi.fn(async () => []);
    const op = defineOperation({
      id: 'demo.bool.list',
      summary: 'x',
      category: 'read',
      kind: 'resource',
      input: z.object({ includeEmpty: z.boolean().default(true).describe('Include empty') }),
      output: z.unknown(),
      run,
    });
    const program = addGlobalOptions(new Command('gacli'));
    mountOperations(program, [op]);
    finalizeProgram(program);
    await runProgram(program, ['node', 'gacli', '-f', 'json', 'demo', 'bool', 'list', '--no-include-empty']);
    expect(run.mock.calls[0][0]).toEqual({ includeEmpty: false });
  });

  it('marks a required boolean as required', async () => {
    const { describeFlags } = await import('../../src/core/cli-adapter.js');
    const op = defineOperation({
      id: 'demo.req.run',
      summary: 'x',
      category: 'action',
      kind: 'resource',
      input: z.object({ acknowledge: z.boolean() }),
      output: z.unknown(),
      run: async () => ({}),
    });
    expect(describeFlags(op).find((f) => f.key === 'acknowledge')?.required).toBe(true);
  });

  it('names a JSON flag exactly once in its error', async () => {
    const { jsonArg } = await import('../../src/operations/json-arg.js');
    const op = defineOperation({
      id: 'demo.json.run',
      summary: 'x',
      category: 'read',
      kind: 'resource',
      input: z.object({ steps: jsonArg(z.array(z.object({ name: z.string() }))) }),
      flags: { steps: '--steps <json>' },
      output: z.unknown(),
      run: async () => ({}),
    });
    const program = addGlobalOptions(new Command('gacli'));
    mountOperations(program, [op]);
    finalizeProgram(program);
    try {
      await runProgram(program, [
        'node',
        'gacli',
        '-f',
        'json',
        'demo',
        'json',
        'run',
        '--steps',
        '[{"nam":1}]',
      ]);
    } catch {
      // stubbed exit
    }
    const message = JSON.parse(stderr[0]).error.message as string;
    expect(message.match(/--steps/g)).toHaveLength(1);
    expect(message).toContain('--steps.0.name');
  });

  it('rejects input keys that collide with global options (they would be swallowed by -p etc.)', () => {
    const bad = defineOperation({
      id: 'demo.global.list',
      summary: 'x',
      category: 'read',
      kind: 'resource',
      input: z.object({ property: z.string().optional() }),
      output: z.unknown(),
      run: async () => [],
    });
    expect(() => mountOperations(addGlobalOptions(new Command('gacli')), [bad])).toThrow(/global option/);
  });
});
