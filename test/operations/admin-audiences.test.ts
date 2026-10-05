import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = {
  listAudiences: vi.fn(),
  getAudience: vi.fn(),
  createAudience: vi.fn(),
  updateAudience: vi.fn(),
  archiveAudience: vi.fn(),
};
vi.mock('../../src/services/admin-api.service.js', () => ({ getAdminClient: vi.fn(async () => client) }));

const { describeFlags } = await import('../../src/core/cli-adapter.js');
const au = await import('../../src/operations/admin/audiences.op.js');

const ctx = { property: '123', globals: {} as never, interactive: false };
const audience = {
  name: 'properties/123/audiences/7',
  displayName: 'Buyers',
  description: '',
  membershipDurationDays: 30,
  adsPersonalizationEnabled: true,
  filterClauses: [],
};
const clauses = [
  {
    clauseType: 'INCLUDE',
    simpleFilter: {
      scope: 'AUDIENCE_FILTER_SCOPE_ACROSS_ALL_SESSIONS',
      filterExpression: { andGroup: { filterExpressions: [] } },
    },
  },
];

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
  for (const fn of Object.values(client)) fn.mockReset().mockResolvedValue([audience]);
});

describe('admin audiences ops', () => {
  it('exports ops in 1.x order and accepts every 1.x flag', () => {
    expect(au.audienceOps.map((o) => o.id)).toEqual([
      'admin.audiences.list',
      'admin.audiences.get',
      'admin.audiences.create',
      'admin.audiences.update',
      'admin.audiences.archive',
    ]);
    for (const op of au.audienceOps) {
      const before = fixtureFlags(`admin_audiences_${op.id.split('.').at(-1)}.txt`);
      expect(describeFlags(op).map((f) => f.flag)).toEqual(expect.arrayContaining(before));
    }
  });

  it('list: property parent, 1.x columns', async () => {
    const op = au.listAudiences;
    expect(op.category).toBe('read');
    expect(op.needsProperty).toBe(true);
    client.listAudiences.mockResolvedValue([[audience]]);
    const out = await op.run(op.input.parse({}), ctx);
    expect(client.listAudiences).toHaveBeenCalledWith({ parent: 'properties/123' });
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.map((c) => c.header)).toEqual([
      'Name',
      'Display Name',
      'Description',
      'Membership Duration Days',
    ]);
  });

  it('get: by name', async () => {
    const op = au.getAudience;
    expect(op.category).toBe('read');
    expect(op.needsProperty).toBeFalsy();
    const out = await op.run(op.input.parse({ name: audience.name }), ctx);
    expect(client.getAudience).toHaveBeenCalledWith({ name: audience.name });
    expect(op.output.safeParse(out).success).toBe(true);
  });

  it('create: 1.x defaults (30 days, no clauses, ads personalization on)', async () => {
    const op = au.createAudience;
    expect(op.category).toBe('create');
    expect(op.needsProperty).toBe(true);
    const out = await op.run(op.input.parse({ displayName: 'Buyers' }), ctx);
    expect(client.createAudience).toHaveBeenCalledWith({
      parent: 'properties/123',
      audience: {
        displayName: 'Buyers',
        description: '',
        membershipDurationDays: 30,
        filterClauses: [],
        adsPersonalizationEnabled: true,
      },
    });
    expect(op.output.safeParse(out).success).toBe(true);
  });

  it('create: coerces days and parses --filter-clauses JSON', async () => {
    const op = au.createAudience;
    await op.run(
      op.input.parse({
        displayName: 'Buyers',
        description: 'People who bought',
        membershipDurationDays: '90',
        filterClauses: JSON.stringify(clauses),
      }),
      ctx,
    );
    expect(client.createAudience).toHaveBeenCalledWith({
      parent: 'properties/123',
      audience: {
        displayName: 'Buyers',
        description: 'People who bought',
        membershipDurationDays: 90,
        filterClauses: clauses,
        adsPersonalizationEnabled: true,
      },
    });
  });

  it('create: rejects bad JSON, non-array clauses and non-numeric days', () => {
    const op = au.createAudience;
    const bad = op.input.safeParse({ displayName: 'B', filterClauses: '[{' });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0].path[0]).toBe('filterClauses');
    expect(bad.error?.issues[0].message).toMatch(/^Invalid JSON/);
    expect(op.input.safeParse({ displayName: 'B', filterClauses: '{"clauseType":"INCLUDE"}' }).success).toBe(
      false,
    );
    expect(op.input.safeParse({ displayName: 'B', filterClauses: '[{"clauseType":"MAYBE"}]' }).success).toBe(
      false,
    );
    expect(op.input.safeParse({ displayName: 'B', membershipDurationDays: 'ten' }).success).toBe(false);
  });

  it('update: mask like 1.x', async () => {
    const op = au.updateAudience;
    expect(op.category).toBe('update');
    expect(op.needsProperty).toBeFalsy();
    const out = await op.run(
      op.input.parse({ name: audience.name, displayName: 'New', description: '' }),
      ctx,
    );
    expect(client.updateAudience).toHaveBeenCalledWith({
      audience: { name: audience.name, displayName: 'New', description: '' },
      updateMask: { paths: ['display_name', 'description'] },
    });
    expect(op.output.safeParse(out).success).toBe(true);

    await op.run(op.input.parse({ name: audience.name, displayName: '' }), ctx);
    expect(client.updateAudience).toHaveBeenLastCalledWith({
      audience: { name: audience.name },
      updateMask: { paths: [] },
    });
  });

  it('archive: delete category, status row', async () => {
    const op = au.archiveAudience;
    expect(op.category).toBe('delete');
    const out = await op.run(op.input.parse({ name: audience.name }), ctx);
    expect(client.archiveAudience).toHaveBeenCalledWith({ name: audience.name });
    expect(out).toEqual({ name: audience.name, archived: true });
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.map((c) => c.header)).toEqual(['Status', 'Audience']);
  });
});
