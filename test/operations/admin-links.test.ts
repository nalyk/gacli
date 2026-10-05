import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const adminClient = {
  listFirebaseLinks: vi.fn(),
  createFirebaseLink: vi.fn(),
  deleteFirebaseLink: vi.fn(),
  listGoogleAdsLinks: vi.fn(),
  createGoogleAdsLink: vi.fn(),
  updateGoogleAdsLink: vi.fn(),
  deleteGoogleAdsLink: vi.fn(),
  listBigQueryLinks: vi.fn(),
  getBigQueryLink: vi.fn(),
  createBigQueryLink: vi.fn(),
  deleteBigQueryLink: vi.fn(),
};
vi.mock('../../src/services/admin-api.service.js', () => ({
  getAdminClient: vi.fn(async () => adminClient),
}));

const fb = await import('../../src/operations/admin/firebase-links.op.js');
const gads = await import('../../src/operations/admin/google-ads-links.op.js');
const bq = await import('../../src/operations/admin/bigquery-links.op.js');
const { describeFlags } = await import('../../src/core/cli-adapter.js');

const ctx = { property: '123', globals: {} as never, interactive: false };

// Same parsing as flagTokens in test/cli/help-compat.test.ts.
function fixtureFlags(group: string, leaf: string): string[] {
  const help = readFileSync(
    resolve(process.cwd(), `test/fixtures/help-v1/admin_${group}_${leaf}.txt`),
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

const groups = [
  { group: 'firebase-links', ops: fb.firebaseLinkOps, leaves: ['list', 'get', 'create', 'delete'] },
  {
    group: 'google-ads-links',
    ops: gads.googleAdsLinkOps,
    leaves: ['list', 'get', 'create', 'update', 'delete'],
  },
  { group: 'bigquery-links', ops: bq.bigQueryLinkOps, leaves: ['list', 'get', 'create', 'delete'] },
];

beforeEach(() => {
  for (const fn of Object.values(adminClient)) fn.mockReset();
});

describe('link op catalogue', () => {
  it.each(groups)('$group: ids in 1.x order, every 1.x flag kept', ({ group, ops, leaves }) => {
    expect(ops.map((o) => o.id)).toEqual(leaves.map((l) => `admin.${group}.${l}`));
    for (const leaf of leaves) {
      const op = ops.find((o) => o.id === `admin.${group}.${leaf}`);
      const flags = describeFlags(op as never).map((s) => s.flag);
      for (const f of fixtureFlags(group, leaf)) expect(flags).toContain(f);
    }
  });

  it('summaries are the 1.x descriptions', () => {
    expect(fb.firebaseLinkOps.map((o) => o.summary)).toEqual([
      'List Firebase links for a property',
      'Get a Firebase link',
      'Create a Firebase link',
      'Delete a Firebase link',
    ]);
    expect(gads.googleAdsLinkOps.map((o) => o.summary)).toEqual([
      'List Google Ads links for a property',
      'Get a Google Ads link',
      'Create a Google Ads link',
      'Update a Google Ads link',
      'Delete a Google Ads link',
    ]);
    expect(bq.bigQueryLinkOps.map((o) => o.summary)).toEqual([
      'List BigQuery links for a property',
      'Get a BigQuery link',
      'Create a BigQuery link',
      'Delete a BigQuery link',
    ]);
  });
});

describe('admin.firebase-links', () => {
  const link = { name: 'properties/123/firebaseLinks/1', project: 'projects/9', createTime: null };

  it('list uses the property parent', async () => {
    adminClient.listFirebaseLinks.mockResolvedValue([[link]]);
    const op = fb.listFirebaseLinks;
    expect(op.category).toBe('read');
    expect(op.needsProperty).toBe(true);
    const out = await op.run(op.input.parse({}), ctx);
    expect(adminClient.listFirebaseLinks).toHaveBeenCalledWith({ parent: 'properties/123' });
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.map((c) => c.header)).toEqual(['Name', 'Project', 'Create Time']);
  });

  it('get lists under the name’s property and picks the match (no Get RPC exists)', async () => {
    const other = { ...link, name: 'properties/123/firebaseLinks/2' };
    adminClient.listFirebaseLinks.mockResolvedValue([[other, link]]);
    const op = fb.getFirebaseLink;
    expect(op.category).toBe('read');
    expect(op.needsProperty).toBeFalsy();
    const out = await op.run(op.input.parse({ name: link.name }), ctx);
    expect(adminClient.listFirebaseLinks).toHaveBeenCalledWith({ parent: 'properties/123' });
    expect(out).toEqual(link);
    expect(op.output.safeParse(out).success).toBe(true);
  });

  it('get fails not_found / usage instead of calling a missing RPC', async () => {
    adminClient.listFirebaseLinks.mockResolvedValue([[]]);
    const op = fb.getFirebaseLink;
    await expect(op.run(op.input.parse({ name: link.name }), ctx)).rejects.toMatchObject({
      kind: 'not_found',
    });
    await expect(op.run(op.input.parse({ name: 'firebaseLinks/1' }), ctx)).rejects.toMatchObject({
      kind: 'usage',
    });
  });

  it('create sends parent + project', async () => {
    adminClient.createFirebaseLink.mockResolvedValue([link]);
    const op = fb.createFirebaseLink;
    expect(op.category).toBe('create');
    expect(op.needsProperty).toBe(true);
    const out = await op.run(op.input.parse({ project: 'projects/9' }), ctx);
    expect(adminClient.createFirebaseLink).toHaveBeenCalledWith({
      parent: 'properties/123',
      firebaseLink: { project: 'projects/9' },
    });
    expect(op.output.safeParse(out).success).toBe(true);
  });

  it('create requires --project', () => {
    expect(fb.createFirebaseLink.input.safeParse({}).success).toBe(false);
  });

  it('delete returns a status row', async () => {
    adminClient.deleteFirebaseLink.mockResolvedValue([{}]);
    const op = fb.deleteFirebaseLink;
    expect(op.category).toBe('delete');
    const out = await op.run(op.input.parse({ name: link.name }), ctx);
    expect(adminClient.deleteFirebaseLink).toHaveBeenCalledWith({ name: link.name });
    expect(out).toEqual({ name: link.name, deleted: true });
    expect(op.columns?.map((c) => c.header)).toEqual(['Status', 'Firebase Link']);
    expect(op.output.safeParse(out).success).toBe(true);
  });
});

describe('admin.google-ads-links', () => {
  const link = {
    name: 'properties/123/googleAdsLinks/5',
    customerId: '1234567890',
    canManageClients: false,
    adsPersonalizationEnabled: { value: true },
    createTime: { seconds: '1', nanos: 0 },
    updateTime: null,
  };

  it('list uses the property parent with 1.x columns', async () => {
    adminClient.listGoogleAdsLinks.mockResolvedValue([[link]]);
    const op = gads.listGoogleAdsLinks;
    expect(op.category).toBe('read');
    expect(op.needsProperty).toBe(true);
    const out = await op.run(op.input.parse({}), ctx);
    expect(adminClient.listGoogleAdsLinks).toHaveBeenCalledWith({ parent: 'properties/123' });
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.map((c) => c.header)).toEqual([
      'Name',
      'Customer ID',
      'Can Manage Clients',
      'Ads Personalization Enabled',
      'Create Time',
      'Update Time',
    ]);
  });

  it('get lists under the name’s property and picks the match (no Get RPC exists)', async () => {
    adminClient.listGoogleAdsLinks.mockResolvedValue([[link]]);
    const op = gads.getGoogleAdsLink;
    expect(op.category).toBe('read');
    const out = await op.run(op.input.parse({ name: link.name }), ctx);
    expect(adminClient.listGoogleAdsLinks).toHaveBeenCalledWith({ parent: 'properties/123' });
    expect(out).toEqual(link);
    expect(op.output.safeParse(out).success).toBe(true);
  });

  it('create sends customerId with ads personalization on, as a BoolValue wrapper', async () => {
    adminClient.createGoogleAdsLink.mockResolvedValue([link]);
    const op = gads.createGoogleAdsLink;
    expect(op.category).toBe('create');
    expect(op.needsProperty).toBe(true);
    const out = await op.run(op.input.parse({ customerId: '1234567890' }), ctx);
    expect(adminClient.createGoogleAdsLink).toHaveBeenCalledWith({
      parent: 'properties/123',
      googleAdsLink: { customerId: '1234567890', adsPersonalizationEnabled: { value: true } },
    });
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.map((c) => c.header)).toEqual([
      'Name',
      'Customer ID',
      'Ads Personalization Enabled',
      'Create Time',
    ]);
  });

  it('update sends a BoolValue and masks ads_personalization_enabled', async () => {
    adminClient.updateGoogleAdsLink.mockResolvedValue([link]);
    const op = gads.updateGoogleAdsLink;
    expect(op.category).toBe('update');
    expect(op.needsProperty).toBeFalsy();
    const out = await op.run(op.input.parse({ name: link.name, adsPersonalizationEnabled: 'false' }), ctx);
    expect(adminClient.updateGoogleAdsLink).toHaveBeenCalledWith({
      googleAdsLink: { name: link.name, adsPersonalizationEnabled: { value: false } },
      updateMask: { paths: ['ads_personalization_enabled'] },
    });
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.map((c) => c.header)).toEqual([
      'Name',
      'Customer ID',
      'Ads Personalization Enabled',
      'Update Time',
    ]);
  });

  it('update with nothing to change is a usage error and never calls the API (1.x cleared the field)', () => {
    expect(gads.updateGoogleAdsLink.input.safeParse({ name: link.name }).success).toBe(false);
  });

  it('update only accepts true or false', () => {
    expect(
      gads.updateGoogleAdsLink.input.safeParse({ name: link.name, adsPersonalizationEnabled: 'yes' }).success,
    ).toBe(false);
  });

  it('update requires --name', () => {
    expect(gads.updateGoogleAdsLink.input.safeParse({ adsPersonalizationEnabled: 'true' }).success).toBe(
      false,
    );
  });

  it('delete returns a status row', async () => {
    adminClient.deleteGoogleAdsLink.mockResolvedValue([{}]);
    const op = gads.deleteGoogleAdsLink;
    expect(op.category).toBe('delete');
    const out = await op.run(op.input.parse({ name: link.name }), ctx);
    expect(adminClient.deleteGoogleAdsLink).toHaveBeenCalledWith({ name: link.name });
    expect(op.columns?.map((c) => c.header)).toEqual(['Status', 'Google Ads Link']);
    expect(op.output.safeParse(out).success).toBe(true);
  });
});

describe('admin.bigquery-links', () => {
  const link = {
    name: 'properties/123/bigQueryLinks/3',
    project: 'projects/p',
    dailyExportEnabled: true,
    streamingExportEnabled: false,
    createTime: null,
  };
  const headers = ['Name', 'Project', 'Daily Export Enabled', 'Streaming Export Enabled', 'Create Time'];

  it('list uses the property parent', async () => {
    adminClient.listBigQueryLinks.mockResolvedValue([[link]]);
    const op = bq.listBigQueryLinks;
    expect(op.category).toBe('read');
    expect(op.needsProperty).toBe(true);
    const out = await op.run(op.input.parse({}), ctx);
    expect(adminClient.listBigQueryLinks).toHaveBeenCalledWith({ parent: 'properties/123' });
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.map((c) => c.header)).toEqual(headers);
  });

  it('get sends the name', async () => {
    adminClient.getBigQueryLink.mockResolvedValue([link]);
    const op = bq.getBigQueryLink;
    const out = await op.run(op.input.parse({ name: link.name }), ctx);
    expect(adminClient.getBigQueryLink).toHaveBeenCalledWith({ name: link.name });
    expect(op.output.safeParse(out).success).toBe(true);
  });

  it('create applies the 1.x defaults (daily on, streaming off)', async () => {
    adminClient.createBigQueryLink.mockResolvedValue([link]);
    const op = bq.createBigQueryLink;
    expect(op.category).toBe('create');
    expect(op.needsProperty).toBe(true);
    const out = await op.run(op.input.parse({ project: 'p' }), ctx);
    expect(adminClient.createBigQueryLink).toHaveBeenCalledWith({
      parent: 'properties/123',
      bigqueryLink: { project: 'p', dailyExportEnabled: true, streamingExportEnabled: false },
    });
    expect(op.output.safeParse(out).success).toBe(true);
    const defaults = Object.fromEntries(describeFlags(op as never).map((s) => [s.key, s.defaultValue]));
    expect(defaults.dailyExportEnabled).toBe('true');
    expect(defaults.streamingExportEnabled).toBe('false');
  });

  it('create honours explicit flags', async () => {
    adminClient.createBigQueryLink.mockResolvedValue([link]);
    const op = bq.createBigQueryLink;
    await op.run(
      op.input.parse({ project: 'p', dailyExportEnabled: 'false', streamingExportEnabled: 'true' }),
      ctx,
    );
    expect(adminClient.createBigQueryLink).toHaveBeenCalledWith({
      parent: 'properties/123',
      bigqueryLink: { project: 'p', dailyExportEnabled: false, streamingExportEnabled: true },
    });
  });

  it('delete returns a status row', async () => {
    adminClient.deleteBigQueryLink.mockResolvedValue([{}]);
    const op = bq.deleteBigQueryLink;
    expect(op.category).toBe('delete');
    const out = await op.run(op.input.parse({ name: link.name }), ctx);
    expect(adminClient.deleteBigQueryLink).toHaveBeenCalledWith({ name: link.name });
    expect(op.columns?.map((c) => c.header)).toEqual(['Status', 'BigQuery Link']);
    expect(op.output.safeParse(out).success).toBe(true);
  });
});
