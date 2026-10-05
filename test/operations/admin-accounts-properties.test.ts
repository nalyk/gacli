import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lostFlags } from './_fixture-flags.js';

const adminClient = {
  listAccounts: vi.fn(),
  listProperties: vi.fn(),
  getProperty: vi.fn(),
  createProperty: vi.fn(),
  updateProperty: vi.fn(),
  deleteProperty: vi.fn(),
};
vi.mock('../../src/services/admin-api.service.js', () => ({
  getAdminClient: vi.fn(async () => adminClient),
}));

const { accountOps, listAccounts } = await import('../../src/operations/admin/accounts.op.js');
const p = await import('../../src/operations/admin/properties.op.js');

const ctx = { property: '123', globals: {} as never, interactive: false };
const ctxNoProp = { ...ctx, property: '' };
const prop = {
  name: 'properties/123',
  displayName: 'Site',
  timeZone: 'Europe/Chisinau',
  currencyCode: 'MDL',
  industryCategory: 'TECHNOLOGY',
  createTime: { seconds: '1' },
};

beforeEach(() => {
  for (const fn of Object.values(adminClient)) fn.mockReset();
});

describe('catalogue', () => {
  it('exports ops in 1.x order with ids, summaries and categories', () => {
    expect(accountOps.map((o) => [o.id, o.summary, o.category, !!o.needsProperty])).toEqual([
      ['admin.accounts.list', 'List all GA4 accounts accessible by the caller', 'read', false],
    ]);
    expect(p.propertyOps.map((o) => [o.id, o.summary, o.category, !!o.needsProperty])).toEqual([
      ['admin.properties.list', 'List GA4 properties under an account', 'read', false],
      ['admin.properties.get', 'Get a GA4 property', 'read', true],
      ['admin.properties.create', 'Create a new GA4 property', 'create', false],
      ['admin.properties.update', 'Update a GA4 property', 'update', true],
      ['admin.properties.delete', 'Delete a GA4 property', 'delete', true],
    ]);
  });

  it('keeps every 1.x flag', () => {
    for (const op of [...accountOps, ...p.propertyOps]) expect(lostFlags(op), op.id).toEqual([]);
  });
});

describe('admin.accounts.list', () => {
  it('calls listAccounts({}) and keeps 1.x columns', async () => {
    adminClient.listAccounts.mockResolvedValue([
      [{ name: 'accounts/1', displayName: 'A', regionCode: 'MD' }],
    ]);
    const out = await listAccounts.run(listAccounts.input.parse({}), ctxNoProp);
    expect(adminClient.listAccounts).toHaveBeenCalledWith({});
    expect(listAccounts.output.safeParse(out).success).toBe(true);
    expect(listAccounts.columns?.map((c) => c.header)).toEqual([
      'Name',
      'Display Name',
      'Create Time',
      'Update Time',
      'Region Code',
    ]);
  });
});

describe('admin.properties', () => {
  it('list filters by parent account like 1.x', async () => {
    adminClient.listProperties.mockResolvedValue([[prop]]);
    const out = await p.listProperties.run(p.listProperties.input.parse({ account: '9' }), ctxNoProp);
    expect(adminClient.listProperties).toHaveBeenCalledWith({ filter: 'parent:accounts/9' });
    await p.listProperties.run(p.listProperties.input.parse({ account: 'accounts/9' }), ctxNoProp);
    expect(adminClient.listProperties).toHaveBeenLastCalledWith({ filter: 'parent:accounts/9' });
    expect(p.listProperties.output.safeParse(out).success).toBe(true);
    expect(p.listProperties.columns?.map((c) => c.header)).toEqual([
      'Name',
      'Display Name',
      'Time Zone',
      'Currency Code',
      'Industry Category',
      'Create Time',
    ]);
  });

  it('list requires --account', () => {
    expect(p.listProperties.input.safeParse({}).success).toBe(false);
  });

  it('get uses the global property', async () => {
    adminClient.getProperty.mockResolvedValue([prop]);
    const out = await p.getProperty.run(p.getProperty.input.parse({}), ctx);
    expect(adminClient.getProperty).toHaveBeenCalledWith({ name: 'properties/123' });
    expect(p.getProperty.output.safeParse(out).success).toBe(true);
  });

  it('create sends the 1.x body with USD default', async () => {
    adminClient.createProperty.mockResolvedValue([prop]);
    const input = p.createProperty.input.parse({
      account: '9',
      displayName: 'Site',
      timeZone: 'Europe/Chisinau',
    });
    const out = await p.createProperty.run(input, ctxNoProp);
    expect(adminClient.createProperty).toHaveBeenCalledWith({
      property: {
        displayName: 'Site',
        parent: 'accounts/9',
        timeZone: 'Europe/Chisinau',
        currencyCode: 'USD',
        industryCategory: undefined,
      },
    });
    const again = p.createProperty.input.parse({ account: 'accounts/9', displayName: 'S', timeZone: 'UTC' });
    await p.createProperty.run(again, ctxNoProp);
    expect(adminClient.createProperty.mock.lastCall?.[0].property.parent).toBe('accounts/9');
    expect(p.createProperty.output.safeParse(out).success).toBe(true);
    expect(p.createProperty.columns?.map((c) => c.header)).toEqual([
      'Name',
      'Display Name',
      'Time Zone',
      'Currency Code',
      'Industry Category',
    ]);
  });

  it('create rejects a missing --display-name', () => {
    expect(p.createProperty.input.safeParse({ account: '9', timeZone: 'UTC' }).success).toBe(false);
  });

  it('update sends only provided fields with snake_case mask', async () => {
    adminClient.updateProperty.mockResolvedValue([prop]);
    const input = p.updateProperty.input.parse({
      currencyCode: 'EUR',
      displayName: 'New',
      industryCategory: '',
    });
    const out = await p.updateProperty.run(input, ctx);
    expect(adminClient.updateProperty).toHaveBeenCalledWith({
      property: { name: 'properties/123', displayName: 'New', currencyCode: 'EUR' },
      updateMask: { paths: ['display_name', 'currency_code'] },
    });
    expect(p.updateProperty.output.safeParse(out).success).toBe(true);
  });

  it('update with all four fields orders the mask like 1.x', async () => {
    adminClient.updateProperty.mockResolvedValue([prop]);
    await p.updateProperty.run(
      p.updateProperty.input.parse({
        industryCategory: 'TECHNOLOGY',
        timeZone: 'UTC',
        currencyCode: 'EUR',
        displayName: 'N',
      }),
      ctx,
    );
    expect(adminClient.updateProperty.mock.calls[0][0].updateMask.paths).toEqual([
      'display_name',
      'time_zone',
      'currency_code',
      'industry_category',
    ]);
  });

  it('delete deletes the global property and returns a status row', async () => {
    adminClient.deleteProperty.mockResolvedValue([{}]);
    const out = await p.deleteProperty.run(p.deleteProperty.input.parse({}), ctx);
    expect(adminClient.deleteProperty).toHaveBeenCalledWith({ name: 'properties/123' });
    expect(out).toEqual({ property: '123', deleted: true });
    expect(p.deleteProperty.output.safeParse(out).success).toBe(true);
    expect(p.deleteProperty.columns?.map((c) => c.header)).toEqual(['Status', 'Property']);
  });
});
