import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = {
  listKeyEvents: vi.fn(),
  getKeyEvent: vi.fn(),
  createKeyEvent: vi.fn(),
  updateKeyEvent: vi.fn(),
  deleteKeyEvent: vi.fn(),
};
vi.mock('../../src/services/admin-api.service.js', () => ({ getAdminClient: vi.fn(async () => client) }));

const { describeFlags } = await import('../../src/core/cli-adapter.js');
const ke = await import('../../src/operations/admin/key-events.op.js');

const ctx = { property: '123', globals: {} as never, interactive: false };
const event = {
  name: 'properties/123/keyEvents/9',
  eventName: 'purchase',
  countingMethod: 'ONCE_PER_EVENT',
  createTime: { seconds: '1700000000', nanos: 0 },
  custom: true,
  deletable: false,
  defaultValue: { numericValue: 5, currencyCode: 'EUR' },
};

// Same parsing as flagTokens in test/cli/help-compat.test.ts.
function fixtureFlags(file: string): string[] {
  const help = readFileSync(resolve(process.cwd(), 'test/fixtures/help-v1', file), 'utf-8');
  const start = help.indexOf('\nOptions:\n');
  const end = help.indexOf('\n\n', start + 10);
  return help
    .slice(start + 10, end === -1 ? undefined : end)
    .split('\n')
    .map((l) => l.match(/^ {2}(-\S.*?)(?: {2,}|$)/)?.[1])
    .filter((t): t is string => !!t && t !== '-h, --help');
}

beforeEach(() => {
  for (const fn of Object.values(client)) fn.mockReset().mockResolvedValue([event]);
});

describe('admin key-events ops', () => {
  it('exports ops in 1.x order and accepts every 1.x flag', () => {
    expect(ke.keyEventOps.map((o) => o.id)).toEqual([
      'admin.key-events.list',
      'admin.key-events.get',
      'admin.key-events.create',
      'admin.key-events.update',
      'admin.key-events.delete',
    ]);
    for (const op of ke.keyEventOps) {
      const before = fixtureFlags(`admin_key-events_${op.id.split('.').at(-1)}.txt`);
      expect(describeFlags(op).map((f) => f.flag)).toEqual(expect.arrayContaining(before));
    }
  });

  it('list: property parent, 1.x columns', async () => {
    const op = ke.listKeyEvents;
    expect(op.category).toBe('read');
    expect(op.needsProperty).toBe(true);
    client.listKeyEvents.mockResolvedValue([[event]]);
    const out = await op.run(op.input.parse({}), ctx);
    expect(client.listKeyEvents).toHaveBeenCalledWith({ parent: 'properties/123' });
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.map((c) => c.header)).toEqual([
      'Name',
      'Event Name',
      'Counting Method',
      'Create Time',
      'Custom',
      'Deletable',
    ]);
  });

  it('get: by name', async () => {
    const op = ke.getKeyEvent;
    expect(op.category).toBe('read');
    expect(op.needsProperty).toBeFalsy();
    const out = await op.run(op.input.parse({ name: event.name }), ctx);
    expect(client.getKeyEvent).toHaveBeenCalledWith({ name: event.name });
    expect(op.output.safeParse(out).success).toBe(true);
  });

  it('create: default counting method, no default value unless given', async () => {
    const op = ke.createKeyEvent;
    expect(op.category).toBe('create');
    expect(op.needsProperty).toBe(true);
    const out = await op.run(op.input.parse({ eventName: 'purchase', currencyCode: 'EUR' }), ctx);
    expect(client.createKeyEvent).toHaveBeenCalledWith({
      parent: 'properties/123',
      keyEvent: { eventName: 'purchase', countingMethod: 'ONCE_PER_EVENT', defaultValue: undefined },
    });
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.map((c) => c.header)).toEqual([
      'Name',
      'Event Name',
      'Counting Method',
      'Create Time',
    ]);
  });

  it('create: numeric default value with currency', async () => {
    const op = ke.createKeyEvent;
    await op.run(
      op.input.parse({
        eventName: 'purchase',
        countingMethod: 'ONCE_PER_SESSION',
        defaultValue: '9.5',
        currencyCode: 'USD',
      }),
      ctx,
    );
    expect(client.createKeyEvent).toHaveBeenCalledWith({
      parent: 'properties/123',
      keyEvent: {
        eventName: 'purchase',
        countingMethod: 'ONCE_PER_SESSION',
        defaultValue: { numericValue: 9.5, currencyCode: 'USD' },
      },
    });
  });

  it('create: rejects a bad counting method or non-numeric default value', () => {
    const op = ke.createKeyEvent;
    expect(op.input.safeParse({ eventName: 'x', countingMethod: 'ALWAYS' }).success).toBe(false);
    expect(op.input.safeParse({ eventName: 'x', defaultValue: 'abc' }).success).toBe(false);
    expect(op.input.safeParse({}).success).toBe(false);
  });

  it('update: mask like 1.x', async () => {
    const op = ke.updateKeyEvent;
    expect(op.category).toBe('update');
    expect(op.needsProperty).toBeFalsy();
    const out = await op.run(
      op.input.parse({
        name: event.name,
        countingMethod: 'ONCE_PER_SESSION',
        defaultValue: '0',
        currencyCode: 'EUR',
      }),
      ctx,
    );
    expect(client.updateKeyEvent).toHaveBeenCalledWith({
      keyEvent: {
        name: event.name,
        countingMethod: 'ONCE_PER_SESSION',
        defaultValue: { numericValue: 0, currencyCode: 'EUR' },
      },
      updateMask: { paths: ['counting_method', 'default_value'] },
    });
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.map((c) => c.header)).toEqual(['Name', 'Event Name', 'Counting Method']);

    await op.run(op.input.parse({ name: event.name, currencyCode: 'EUR' }), ctx);
    expect(client.updateKeyEvent).toHaveBeenLastCalledWith({
      keyEvent: { name: event.name },
      updateMask: { paths: [] },
    });
  });

  it('delete: delete category, status row', async () => {
    const op = ke.deleteKeyEvent;
    expect(op.category).toBe('delete');
    const out = await op.run(op.input.parse({ name: event.name }), ctx);
    expect(client.deleteKeyEvent).toHaveBeenCalledWith({ name: event.name });
    expect(out).toEqual({ name: event.name, deleted: true });
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.map((c) => c.header)).toEqual(['Status', 'Key Event']);
  });
});
