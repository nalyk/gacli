import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const adminClient = {
  listAccessBindings: vi.fn(),
  getAccessBinding: vi.fn(),
  createAccessBinding: vi.fn(),
  updateAccessBinding: vi.fn(),
  deleteAccessBinding: vi.fn(),
};
vi.mock('../../src/services/admin-api.service.js', () => ({
  getAdminClient: vi.fn(async () => adminClient),
}));

const ab = await import('../../src/operations/admin/access-bindings.op.js');
const { describeFlags } = await import('../../src/core/cli-adapter.js');

const ctx = { property: '', globals: {} as never, interactive: false };
const binding = {
  name: 'accounts/1/accessBindings/7',
  user: 'a@b.c',
  roles: ['predefinedRoles/viewer', 'predefinedRoles/analyst'],
};

// Same parsing as flagTokens in test/cli/help-compat.test.ts.
function fixtureFlags(leaf: string): string[] {
  const help = readFileSync(
    resolve(process.cwd(), `test/fixtures/help-v1/admin_access-bindings_${leaf}.txt`),
    'utf-8',
  );
  const start = help.indexOf('\nOptions:\n');
  const end = help.indexOf('\n\n', start + 10);
  return help
    .slice(start + 10, end === -1 ? undefined : end)
    .split('\n')
    .map((l) => l.match(/^ {2}(-\S.*?)(?: {2,}|$)/)?.[1])
    .filter((t): t is string => !!t && t !== '-h, --help');
}

beforeEach(() => {
  for (const fn of Object.values(adminClient)) fn.mockReset();
});

describe('admin.access-bindings', () => {
  it('exports ops in 1.x order with CLI-path ids and 1.x summaries', () => {
    expect(ab.accessBindingOps.map((o) => o.id)).toEqual([
      'admin.access-bindings.list',
      'admin.access-bindings.get',
      'admin.access-bindings.create',
      'admin.access-bindings.update',
      'admin.access-bindings.delete',
    ]);
    expect(ab.accessBindingOps.map((o) => o.summary)).toEqual([
      'List access bindings for an account or property',
      'Get an access binding',
      'Create an access binding',
      'Update an access binding',
      'Delete an access binding',
    ]);
  });

  it.each(['list', 'get', 'create', 'update', 'delete'])('%s keeps every 1.x flag string', (leaf) => {
    const op = ab.accessBindingOps.find((o) => o.id === `admin.access-bindings.${leaf}`);
    const flags = describeFlags(op as never).map((s) => s.flag);
    const expected = fixtureFlags(leaf);
    expect(expected.length).toBeGreaterThan(0);
    for (const f of expected) expect(flags).toContain(f);
  });

  it('list uses --parent (not the global property)', async () => {
    adminClient.listAccessBindings.mockResolvedValue([[binding]]);
    const op = ab.listAccessBindings;
    expect(op.category).toBe('read');
    expect(op.needsProperty).toBe(false);
    const out = await op.run(op.input.parse({ parent: 'accounts/1' }), ctx);
    expect(adminClient.listAccessBindings).toHaveBeenCalledWith({ parent: 'accounts/1' });
    expect(out).toEqual([binding]);
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.map((c) => c.header)).toEqual(['Name', 'User', 'Roles']);
    const roles = op.columns?.find((c) => c.header === 'Roles');
    expect(roles?.format?.(binding.roles)).toBe('predefinedRoles/viewer, predefinedRoles/analyst');
    expect(roles?.format?.(undefined)).toBe('');
  });

  it('list requires --parent', () => {
    expect(ab.listAccessBindings.input.safeParse({}).success).toBe(false);
  });

  it('get sends the name', async () => {
    adminClient.getAccessBinding.mockResolvedValue([binding]);
    const op = ab.getAccessBinding;
    expect(op.category).toBe('read');
    expect(op.needsProperty).toBeFalsy();
    const out = await op.run(op.input.parse({ name: binding.name }), ctx);
    expect(adminClient.getAccessBinding).toHaveBeenCalledWith({ name: binding.name });
    expect(op.output.safeParse(out).success).toBe(true);
  });

  it('create sends parent + user + roles like 1.x', async () => {
    adminClient.createAccessBinding.mockResolvedValue([binding]);
    const op = ab.createAccessBinding;
    expect(op.category).toBe('create');
    expect(op.needsProperty).toBeFalsy();
    const out = await op.run(
      op.input.parse({ parent: 'accounts/1', user: 'a@b.c', roles: binding.roles }),
      ctx,
    );
    expect(adminClient.createAccessBinding).toHaveBeenCalledWith({
      parent: 'accounts/1',
      accessBinding: { user: 'a@b.c', roles: binding.roles },
    });
    expect(op.output.safeParse(out).success).toBe(true);
  });

  it('create rejects missing roles', () => {
    expect(ab.createAccessBinding.input.safeParse({ parent: 'accounts/1', user: 'a@b.c' }).success).toBe(
      false,
    );
  });

  it('update sends name + roles without an update mask (1.x parity)', async () => {
    adminClient.updateAccessBinding.mockResolvedValue([binding]);
    const op = ab.updateAccessBinding;
    expect(op.category).toBe('update');
    expect(op.needsProperty).toBeFalsy();
    const out = await op.run(op.input.parse({ name: binding.name, roles: ['predefinedRoles/editor'] }), ctx);
    expect(adminClient.updateAccessBinding).toHaveBeenCalledWith({
      accessBinding: { name: binding.name, roles: ['predefinedRoles/editor'] },
    });
    expect(op.output.safeParse(out).success).toBe(true);
  });

  it('delete is a delete-category op with a 1.x status row', async () => {
    adminClient.deleteAccessBinding.mockResolvedValue([{}]);
    const op = ab.deleteAccessBinding;
    expect(op.category).toBe('delete');
    expect(op.needsProperty).toBeFalsy();
    const out = await op.run(op.input.parse({ name: binding.name }), ctx);
    expect(adminClient.deleteAccessBinding).toHaveBeenCalledWith({ name: binding.name });
    expect(out).toEqual({ name: binding.name, deleted: true });
    expect(op.columns?.map((c) => c.header)).toEqual(['Status', 'Access Binding']);
    expect(op.output.safeParse(out).success).toBe(true);
  });
});
