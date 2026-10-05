import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { defineOperation } from '../../src/core/operation.js';
import { mcpSession } from '../helpers/mcp-driver.js';

const { createServerFactory, exposedOperations, toolAnnotations, toolName } = await import(
  '../../src/core/mcp-adapter.js'
);

const listRun = vi.fn(async (_input: unknown, ctx: { property: string }) => [
  { name: `properties/${ctx.property}/x/1` },
]);
const deleteRun = vi.fn(async ({ name }: { name: string }) => ({ name, deleted: true as const }));
const createRun = vi.fn(async () => ({ name: 'new' }));

const listOp = defineOperation({
  id: 'admin.custom-dimensions.list',
  summary: 'List custom dimensions',
  category: 'read',
  kind: 'resource',
  needsProperty: true,
  input: z.object({ limit: z.coerce.number().int().positive().optional() }),
  output: z.array(z.looseObject({ name: z.string() })),
  run: listRun,
});
const reportOp = defineOperation({
  id: 'report.run',
  summary: 'Run a report',
  category: 'read',
  kind: 'report',
  input: z.object({ metrics: z.array(z.string()).min(1) }),
  output: z.object({
    headers: z.array(z.string()),
    rows: z.array(z.array(z.string())),
    rowCount: z.number(),
  }),
  run: async () => ({ headers: ['sessions'], rows: [['5']], rowCount: 1 }),
});
const notFoundOp = defineOperation({
  id: 'admin.things.get',
  summary: 'Get a thing',
  category: 'read',
  kind: 'resource',
  input: z.object({ name: z.string() }),
  output: z.looseObject({ name: z.string() }),
  run: async () => {
    throw Object.assign(new Error('5 NOT_FOUND: gone'), { code: 5 });
  },
});
const createOp = defineOperation({
  id: 'admin.things.create',
  summary: 'Create a thing',
  category: 'create',
  kind: 'resource',
  input: z.object({ displayName: z.string() }),
  output: z.looseObject({ name: z.string() }),
  run: createRun,
});
const deleteOp = defineOperation({
  id: 'admin.things.delete',
  summary: 'Delete a thing',
  category: 'delete',
  kind: 'resource',
  input: z.object({ name: z.string() }),
  output: z.object({ name: z.string(), deleted: z.literal(true) }),
  run: deleteRun,
});
const ops = [listOp, reportOp, notFoundOp, createOp, deleteOp];
const base = { version: '9.9.9', globals: {} as never };

describe('tool metadata', () => {
  it('names tools ga_<id> with separators as underscores', () => {
    expect(toolName(listOp)).toBe('ga_admin_custom_dimensions_list');
  });

  it('annotates by category', () => {
    expect(toolAnnotations(listOp)).toMatchObject({
      readOnlyHint: true,
      idempotentHint: true,
      title: 'List custom dimensions',
    });
    expect(toolAnnotations(deleteOp)).toMatchObject({ destructiveHint: true });
    expect(toolAnnotations(createOp)).toMatchObject({ readOnlyHint: false, destructiveHint: false });
  });

  it('exposes read-only tools by default and gates writes and deletes', () => {
    const ids = (o: object) => exposedOperations(ops, o).map((op) => op.id);
    expect(ids({})).toEqual(['admin.custom-dimensions.list', 'report.run', 'admin.things.get']);
    expect(ids({ allowWrite: true })).toContain('admin.things.create');
    expect(ids({ allowWrite: true })).not.toContain('admin.things.delete');
    expect(ids({ allowDelete: true })).toEqual(
      expect.arrayContaining(['admin.things.create', 'admin.things.delete']),
    );
  });
});

describe('MCP server generated from operations', () => {
  it('reports its version and lists tools deterministically with input/output schemas', async () => {
    const a = await mcpSession(createServerFactory(ops, { ...base, defaultProperty: '42' })());
    const b = await mcpSession(createServerFactory(ops, { ...base, defaultProperty: '42' })());
    expect(a.init.result?.serverInfo).toMatchObject({ name: 'gacli', version: '9.9.9' });
    const la = (await a.request('tools/list')).result?.tools as {
      name: string;
      inputSchema: { properties: object };
      outputSchema: object;
    }[];
    const lb = (await b.request('tools/list')).result?.tools as { name: string }[];
    expect(la.map((t) => t.name)).toEqual(lb.map((t) => t.name));
    const list = la.find((t) => t.name === 'ga_admin_custom_dimensions_list');
    expect(Object.keys(list?.inputSchema.properties ?? {})).toEqual(
      expect.arrayContaining(['limit', 'propertyId']),
    );
    expect(list?.outputSchema).toMatchObject({ properties: { rowCount: {}, data: {} } });
  });

  it('returns the -f json envelope as structuredContent and text', async () => {
    const s = await mcpSession(createServerFactory(ops, { ...base, defaultProperty: '42' })());
    const r = await s.callTool('ga_admin_custom_dimensions_list', { limit: 2 });
    expect(r.result?.isError).toBeFalsy();
    expect(r.result?.structuredContent).toEqual({ rowCount: 1, data: [{ name: 'properties/42/x/1' }] });
    const text = (r.result?.content as { text: string }[])[0].text;
    expect(JSON.parse(text)).toEqual(r.result?.structuredContent);
    expect(listRun.mock.lastCall?.[0]).toEqual({ limit: 2 });
  });

  it('uses an explicit propertyId over the default', async () => {
    const s = await mcpSession(createServerFactory(ops, { ...base, defaultProperty: '42' })());
    await s.callTool('ga_admin_custom_dimensions_list', { propertyId: '7' });
    expect(listRun.mock.lastCall?.[1]).toMatchObject({ property: '7' });
  });

  it('returns a usage isError when no property is available', async () => {
    const s = await mcpSession(createServerFactory(ops, base)());
    const r = await s.callTool('ga_admin_custom_dimensions_list', {});
    // propertyId is required by the tool schema, so the SDK rejects the call before the handler runs
    expect(r.result?.isError).toBe(true);
    expect((r.result?.content as { text: string }[])[0].text).toContain('propertyId');
  });

  it('maps API errors to isError results and keeps serving', async () => {
    const s = await mcpSession(createServerFactory(ops, base)());
    const r = await s.callTool('ga_admin_things_get', { name: 'n' });
    expect(r.result?.isError).toBe(true);
    expect(JSON.parse((r.result?.content as { text: string }[])[0].text).error.exitCode).toBe(5);
    expect(
      (await s.callTool('ga_report_run', { metrics: ['sessions'] })).result?.structuredContent,
    ).toMatchObject({
      rowCount: 1,
    });
  });

  it('requires confirm: true for delete tools and never calls the API without it', async () => {
    deleteRun.mockClear();
    const s = await mcpSession(createServerFactory(ops, { ...base, allowDelete: true })());
    const r = await s.callTool('ga_admin_things_delete', { name: 'n' });
    expect(r.error ?? r.result?.isError).toBeTruthy();
    expect(deleteRun).not.toHaveBeenCalled();
    const ok = await s.callTool('ga_admin_things_delete', { name: 'n', confirm: true });
    expect(ok.result?.structuredContent).toEqual({ data: { name: 'n', deleted: true } });
  });

  it('supports dryRun on mutating tools', async () => {
    createRun.mockClear();
    const s = await mcpSession(createServerFactory(ops, { ...base, allowWrite: true })());
    const r = await s.callTool('ga_admin_things_create', { displayName: 'X', dryRun: true });
    expect(createRun).not.toHaveBeenCalled();
    expect(r.result?.isError).toBeFalsy();
    expect(r.result?.structuredContent).toMatchObject({
      dryRun: true,
      preview: { operation: 'admin.things.create', input: { displayName: 'X' } },
    });
  });

  it('registers every real operation as a valid tool', async () => {
    const { OPERATIONS } = await import('../../src/operations/index.js');
    const s = await mcpSession(createServerFactory(OPERATIONS, { ...base, allowDelete: true })());
    const r = await s.request('tools/list');
    expect(r.error).toBeUndefined();
    const tools = r.result?.tools as { name: string; outputSchema: { type: string } }[];
    expect(tools).toHaveLength(OPERATIONS.length);
    expect(tools.every((t) => t.outputSchema.type === 'object')).toBe(true);
    expect(new Set(tools.map((t) => t.name)).size).toBe(tools.length);
  });

  it('never reads server files from JSON arguments', async () => {
    const { jsonArg } = await import('../../src/operations/json-arg.js');
    const run = vi.fn(async () => ({ ok: true }));
    const jsonOp = defineOperation({
      id: 'demo.json.get',
      summary: 'x',
      category: 'read',
      kind: 'resource',
      input: z.object({ steps: jsonArg(z.array(z.unknown()), '--steps') }),
      output: z.looseObject({}),
      run,
    });
    const s = await mcpSession(createServerFactory([jsonOp], base)());
    const r = await s.callTool('ga_demo_json_get', { steps: '@/etc/hosts' });
    expect(r.result?.isError).toBe(true);
    expect((r.result?.content as { text: string }[])[0].text).toMatch(/not allowed/);
    expect(run).not.toHaveBeenCalled();
    const { setFileArgsAllowed } = await import('../../src/operations/json-arg.js');
    setFileArgsAllowed(true);
  });

  it('requires an explicit propertyId on property-scoped delete tools even with a default', async () => {
    const propDelete = defineOperation({
      id: 'admin.props.delete',
      summary: 'Delete the property',
      category: 'delete',
      kind: 'resource',
      needsProperty: true,
      input: z.object({}),
      output: z.object({ deleted: z.literal(true) }),
      run: async () => ({ deleted: true as const }),
    });
    const s = await mcpSession(
      createServerFactory([propDelete], { ...base, defaultProperty: '42', allowDelete: true })(),
    );
    const tools = (await s.request('tools/list')).result?.tools as { inputSchema: { required?: string[] } }[];
    expect(tools[0].inputSchema.required).toEqual(expect.arrayContaining(['propertyId', 'confirm']));
    const r = await s.callTool('ga_admin_props_delete', { confirm: true });
    expect(r.result?.isError).toBe(true);
  });
});
