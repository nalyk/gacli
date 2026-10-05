import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lostFlags } from './_fixture-flags.js';

const adminClient = {
  listDataStreams: vi.fn(),
  getDataStream: vi.fn(),
  createDataStream: vi.fn(),
  updateDataStream: vi.fn(),
  deleteDataStream: vi.fn(),
};
vi.mock('../../src/services/admin-api.service.js', () => ({
  getAdminClient: vi.fn(async () => adminClient),
}));

const ds = await import('../../src/operations/admin/datastreams.op.js');

const ctx = { property: '123', globals: {} as never, interactive: false };
const stream = {
  name: 'properties/123/dataStreams/7',
  type: 'WEB_DATA_STREAM',
  displayName: 'Web',
  webStreamData: { defaultUri: 'https://x.md', measurementId: 'G-1' },
};

beforeEach(() => {
  for (const fn of Object.values(adminClient)) fn.mockReset();
});

describe('catalogue', () => {
  it('exports ops in 1.x order with ids, summaries and categories', () => {
    expect(ds.dataStreamOps.map((o) => [o.id, o.summary, o.category, !!o.needsProperty])).toEqual([
      ['admin.datastreams.list', 'List data streams for a property', 'read', true],
      ['admin.datastreams.get', 'Get a data stream', 'read', false],
      ['admin.datastreams.create', 'Create a data stream', 'create', true],
      ['admin.datastreams.update', 'Update a data stream', 'update', false],
      ['admin.datastreams.delete', 'Delete a data stream', 'delete', false],
    ]);
  });

  it('keeps every 1.x flag', () => {
    for (const op of ds.dataStreamOps) expect(lostFlags(op), op.id).toEqual([]);
  });
});

describe('admin.datastreams', () => {
  it('list uses the property parent', async () => {
    adminClient.listDataStreams.mockResolvedValue([[stream]]);
    const out = await ds.listDataStreams.run(ds.listDataStreams.input.parse({}), ctx);
    expect(adminClient.listDataStreams).toHaveBeenCalledWith({ parent: 'properties/123' });
    expect(ds.listDataStreams.output.safeParse(out).success).toBe(true);
    expect(ds.listDataStreams.columns?.map((c) => c.header)).toEqual([
      'Name',
      'Type',
      'Display Name',
      'Create Time',
      'Update Time',
    ]);
  });

  it('get by name', async () => {
    adminClient.getDataStream.mockResolvedValue([stream]);
    const out = await ds.getDataStream.run(ds.getDataStream.input.parse({ name: stream.name }), ctx);
    expect(adminClient.getDataStream).toHaveBeenCalledWith({ name: stream.name });
    expect(ds.getDataStream.output.safeParse(out).success).toBe(true);
  });

  it('create WEB sends the 1.x body', async () => {
    adminClient.createDataStream.mockResolvedValue([stream]);
    const input = ds.createDataStream.input.parse({
      type: 'WEB_DATA_STREAM',
      displayName: 'Web',
      uri: 'https://x.md',
    });
    const out = await ds.createDataStream.run(input, ctx);
    expect(adminClient.createDataStream).toHaveBeenCalledWith({
      parent: 'properties/123',
      dataStream: {
        type: 'WEB_DATA_STREAM',
        displayName: 'Web',
        webStreamData: { defaultUri: 'https://x.md' },
        androidAppStreamData: undefined,
        iosAppStreamData: undefined,
      },
    });
    expect(ds.createDataStream.output.safeParse(out).success).toBe(true);
    expect(ds.createDataStream.columns?.map((c) => c.header)).toEqual([
      'Name',
      'Type',
      'Display Name',
      'Create Time',
    ]);
  });

  it('create ANDROID and IOS send their app stream data', async () => {
    adminClient.createDataStream.mockResolvedValue([stream]);
    await ds.createDataStream.run(
      ds.createDataStream.input.parse({
        type: 'ANDROID_APP_DATA_STREAM',
        displayName: 'A',
        packageName: 'md.x',
      }),
      ctx,
    );
    await ds.createDataStream.run(
      ds.createDataStream.input.parse({ type: 'IOS_APP_DATA_STREAM', displayName: 'I', bundleId: 'md.y' }),
      ctx,
    );
    expect(adminClient.createDataStream.mock.calls[0][0].dataStream.androidAppStreamData).toEqual({
      packageName: 'md.x',
    });
    expect(adminClient.createDataStream.mock.calls[1][0].dataStream.iosAppStreamData).toEqual({
      bundleId: 'md.y',
    });
  });

  it.each([
    ['WEB_DATA_STREAM', '--uri'],
    ['ANDROID_APP_DATA_STREAM', '--package-name'],
    ['IOS_APP_DATA_STREAM', '--bundle-id'],
  ])('create %s without %s is a usage error', (type, flag) => {
    const r = ds.createDataStream.input.safeParse({ type, displayName: 'X' });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.message).join(' ')).toContain(flag);
  });

  it('create rejects an unknown --type', () => {
    expect(ds.createDataStream.input.safeParse({ type: 'TV', displayName: 'X' }).success).toBe(false);
  });

  it('update sends display_name mask', async () => {
    adminClient.updateDataStream.mockResolvedValue([stream]);
    const out = await ds.updateDataStream.run(
      ds.updateDataStream.input.parse({ name: stream.name, displayName: 'New' }),
      ctx,
    );
    expect(adminClient.updateDataStream).toHaveBeenCalledWith({
      dataStream: { name: stream.name, displayName: 'New' },
      updateMask: { paths: ['display_name'] },
    });
    expect(ds.updateDataStream.output.safeParse(out).success).toBe(true);
    expect(ds.updateDataStream.columns?.map((c) => c.header)).toEqual([
      'Name',
      'Type',
      'Display Name',
      'Update Time',
    ]);
  });

  it('update requires --display-name', () => {
    expect(ds.updateDataStream.input.safeParse({ name: stream.name }).success).toBe(false);
  });

  it('delete by name returns a status row', async () => {
    adminClient.deleteDataStream.mockResolvedValue([{}]);
    const out = await ds.deleteDataStream.run(ds.deleteDataStream.input.parse({ name: stream.name }), ctx);
    expect(adminClient.deleteDataStream).toHaveBeenCalledWith({ name: stream.name });
    expect(out).toEqual({ name: stream.name, deleted: true });
    expect(ds.deleteDataStream.columns?.map((c) => c.header)).toEqual(['Status', 'Data Stream']);
  });
});
