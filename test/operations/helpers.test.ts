import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('../../src/services/admin-api.service.js', () => ({
  getAdminClient: vi.fn(async () => ({ fake: true })),
}));

const { jsonArg } = await import('../../src/operations/json-arg.js');
const { getOp, listOp, removeOp, updateMask, parentOf } = await import(
  '../../src/operations/admin/_helpers.js'
);

const steps = z.array(z.object({ name: z.string() }));
const ctx = { property: '42', globals: {} as never, interactive: false };

describe('jsonArg', () => {
  it('parses inline JSON and validates it', () => {
    expect(jsonArg(steps, '--steps').parse('[{"name":"a"}]')).toEqual([{ name: 'a' }]);
  });

  it('reads @file', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'gacli-json-')), 'steps.json');
    writeFileSync(f, '[{"name":"b"}]');
    expect(jsonArg(steps, '--steps').parse(`@${f}`)).toEqual([{ name: 'b' }]);
  });

  it('reads @- from stdin via the reader', () => {
    const read = vi.fn(() => '[{"name":"c"}]');
    expect(jsonArg(steps, '--steps', read).parse('@-')).toEqual([{ name: 'c' }]);
    expect(read).toHaveBeenCalledWith(0);
  });

  it('reports invalid JSON naming the flag', () => {
    const r = jsonArg(steps, '--steps').safeParse('[{');
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/Invalid JSON for --steps/);
  });

  it('reports a missing file naming the path', () => {
    const r = jsonArg(steps, '--steps').safeParse('@/nope/x.json');
    expect(r.error?.issues[0].message).toContain('/nope/x.json');
  });

  it('reports schema mismatches naming the flag', () => {
    const r = jsonArg(steps, '--steps').safeParse('[{"nam":"a"}]');
    expect(r.error?.issues[0].message).toContain('--steps');
  });

  it('is a plain string in input JSON Schema', () => {
    expect(
      z.toJSONSchema(z.object({ s: jsonArg(steps, '--steps') }), { io: 'input' }).properties?.s,
    ).toMatchObject({
      type: 'string',
    });
  });
});

describe('updateMask', () => {
  it('includes only defined keys, with snake_case paths', () => {
    expect(
      updateMask(
        { displayName: 'x', description: undefined },
        { displayName: 'display_name', description: 'description' },
      ),
    ).toEqual({ body: { displayName: 'x' }, paths: ['display_name'] });
  });
});

describe('admin op helpers', () => {
  it('parentOf builds resource parents', () => {
    expect(parentOf('property', '1')).toBe('properties/1');
    expect(parentOf('account', '9')).toBe('accounts/9');
  });

  it('listOp passes client and context to call, needs a property by default', async () => {
    const call = vi.fn(async () => [{ name: 'a' }]);
    const op = listOp({
      id: 'admin.things.list',
      summary: 'List things',
      rpc: 'ListThings',
      item: z.looseObject({ name: z.string() }),
      columns: [{ header: 'Name', path: 'name' }],
      call,
    });
    expect(op.needsProperty).toBe(true);
    expect(op.category).toBe('read');
    expect(await op.run(op.input.parse({}), ctx)).toEqual([{ name: 'a' }]);
    expect(call).toHaveBeenCalledWith({ fake: true }, ctx, {});
  });

  it('getOp takes --name and returns the item', async () => {
    const op = getOp({
      id: 'admin.things.get',
      summary: 'Get a thing',
      rpc: 'GetThing',
      label: 'Thing',
      item: z.looseObject({ name: z.string() }),
      columns: [],
      call: async (_c, name) => ({ name }),
    });
    expect(op.flags).toEqual({ name: '--name <resourceName>' });
    expect(await op.run(op.input.parse({ name: 'n' }), ctx)).toEqual({ name: 'n' });
  });

  it('removeOp is a delete-category op returning a status row', async () => {
    const call = vi.fn(async () => undefined);
    const op = removeOp({
      id: 'admin.things.archive',
      summary: 'Archive',
      rpc: 'ArchiveThing',
      label: 'Thing',
      verb: 'archive',
      call,
    });
    expect(op.category).toBe('delete');
    expect(await op.run(op.input.parse({ name: 'n' }), ctx)).toEqual({ name: 'n', archived: true });
    expect(op.columns?.map((c) => c.header)).toEqual(['Status', 'Thing']);
    const del = removeOp({
      id: 'admin.things.delete',
      summary: 'Delete',
      rpc: 'DeleteThing',
      label: 'Thing',
      verb: 'delete',
      call,
    });
    expect(await del.run(del.input.parse({ name: 'n' }), ctx)).toEqual({ name: 'n', deleted: true });
  });
});

describe('jsonArg file references can be disabled (MCP)', () => {
  it('rejects @path and @- when file args are not allowed, still accepts inline JSON', async () => {
    const { setFileArgsAllowed } = await import('../../src/operations/json-arg.js');
    setFileArgsAllowed(false);
    try {
      const schema = jsonArg(steps, '--steps');
      expect(schema.safeParse('@/etc/passwd').error?.issues[0].message).toMatch(/not allowed/);
      expect(schema.safeParse('@-').success).toBe(false);
      expect(schema.parse('[{"name":"a"}]')).toEqual([{ name: 'a' }]);
    } finally {
      setFileArgsAllowed(true);
    }
  });
});
