import { describe, expect, it, vi } from 'vitest';
import { GacliError } from '../../src/core/errors.js';

const { parseServiceArg, resolveMethod, executeApiCall, methodKind } = await import(
  '../../src/commands/api/resolve.js'
);

describe('parseServiceArg', () => {
  it('defaults admin to v1alpha and data to v1beta', () => {
    expect(parseServiceArg('admin')).toEqual({ service: 'admin', version: 'v1alpha' });
    expect(parseServiceArg('data')).toEqual({ service: 'data', version: 'v1beta' });
    expect(parseServiceArg('admin.v1beta')).toEqual({ service: 'admin', version: 'v1beta' });
    expect(parseServiceArg('data.v1alpha')).toEqual({ service: 'data', version: 'v1alpha' });
  });

  it('rejects unknown services', () => {
    expect(() => parseServiceArg('ads')).toThrow(GacliError);
  });
});

describe('resolveMethod', () => {
  const names = ['listProperties', 'getProperty', 'deleteProperty'];
  it.each(['ListProperties', 'listProperties', 'LISTPROPERTIES'])('resolves %s', (m) => {
    expect(resolveMethod(m, names)).toBe('listProperties');
  });

  it('suggests close matches for unknown methods', () => {
    try {
      resolveMethod('listProprties', names);
      expect.unreachable();
    } catch (e) {
      expect((e as GacliError).kind).toBe('usage');
      expect((e as GacliError).hint).toContain('listProperties');
    }
  });
});

describe('methodKind', () => {
  it.each([
    ['listProperties', 'read'],
    ['runAccessReport', 'read'],
    ['searchChangeHistoryEvents', 'read'],
    ['createProperty', 'mutate'],
    ['deleteProperty', 'delete'],
    ['archiveCustomDimension', 'delete'],
    ['batchDeleteAccessBindings', 'delete'],
    ['submitUserDeletion', 'delete'],
    ['provisionAccountTicket', 'mutate'],
  ])('%s → %s', (m, k) => {
    expect(methodKind(m)).toBe(k);
  });
});

describe('executeApiCall', () => {
  const client = { listProperties: vi.fn(async () => [[{ name: 'properties/1' }]]), deleteProperty: vi.fn() };
  const deps = { loadClient: vi.fn(async () => client), ensureCredentials: async () => undefined };

  it('calls the resolved method with the body and returns the first response element', async () => {
    const out = await executeApiCall(
      {
        service: 'admin',
        method: 'ListProperties',
        body: { filter: 'parent:accounts/1' },
        interactive: false,
      },
      deps,
    );
    expect(client.listProperties).toHaveBeenCalledWith({ filter: 'parent:accounts/1' });
    expect(out).toEqual({ result: [{ name: 'properties/1' }] });
  });

  it('rejects a body that fails proto verification as usage', async () => {
    await expect(
      executeApiCall(
        { service: 'admin', method: 'listProperties', body: { pageSize: 'x' }, interactive: false },
        deps,
      ),
    ).rejects.toMatchObject({ kind: 'usage' });
  });

  it('refuses a delete without --yes when not interactive', async () => {
    await expect(
      executeApiCall(
        { service: 'admin', method: 'DeleteProperty', body: { name: 'properties/1' }, interactive: false },
        deps,
      ),
    ).rejects.toMatchObject({ kind: 'confirmation' });
    expect(client.deleteProperty).not.toHaveBeenCalled();
  });

  it('dry-run previews without loading a client', async () => {
    deps.loadClient.mockClear();
    const out = await executeApiCall(
      {
        service: 'admin',
        method: 'deleteProperty',
        body: { name: 'properties/1' },
        dryRun: true,
        interactive: false,
      },
      deps,
    );
    expect(out).toEqual({
      preview: {
        dryRun: true,
        service: 'admin',
        version: 'v1alpha',
        method: 'deleteProperty',
        request: { name: 'properties/1' },
      },
    });
    expect(deps.loadClient).not.toHaveBeenCalled();
  });

  it('knows Data API methods per version', async () => {
    await expect(
      executeApiCall({ service: 'data', method: 'chat', body: {}, interactive: false }, deps),
    ).rejects.toMatchObject({ kind: 'usage' });
  });

  it('never serialises a long-running Operation (it carries the auth client)', async () => {
    const operation = {
      name: 'operations/1',
      done: false,
      latestResponse: { name: 'operations/1', done: false, metadata: null },
      longrunningDescriptor: { operationsClient: { auth: { refresh_token: 'S3CRET' } } },
      promise: () => new Promise(() => {}),
    };
    const lro = { createProperty: vi.fn(async () => [operation]) };
    const out = await executeApiCall(
      { service: 'admin', method: 'createProperty', body: {}, interactive: false },
      { loadClient: async () => lro, ensureCredentials: async () => undefined },
    );
    expect(JSON.stringify(out)).not.toContain('S3CRET');
    expect(out.result).toEqual({ name: 'operations/1', done: false, metadata: null });
  });

  it('accepts enum names and string int64 values (proto JSON), rejects unknown fields', async () => {
    const c = { updateDataRetentionSettings: vi.fn(async () => [{}]), runReport: vi.fn(async () => [{}]) };
    const d = { loadClient: async () => c, ensureCredentials: async () => undefined };
    await executeApiCall(
      {
        service: 'admin',
        method: 'UpdateDataRetentionSettings',
        body: {
          dataRetentionSettings: { eventDataRetention: 'FOURTEEN_MONTHS' },
          updateMask: { paths: ['event_data_retention'] },
        },
        interactive: false,
      },
      d,
    );
    expect(c.updateDataRetentionSettings).toHaveBeenCalled();
    await executeApiCall(
      {
        service: 'data',
        method: 'RunReport',
        body: { property: 'properties/1', limit: '10', metricAggregations: ['TOTAL'] },
        interactive: false,
      },
      d,
    );
    expect(c.runReport).toHaveBeenCalled();
    await expect(
      executeApiCall(
        { service: 'admin', method: 'listProperties', body: { bogusField: 1 }, interactive: false },
        d,
      ),
    ).rejects.toMatchObject({ kind: 'usage', message: expect.stringContaining('bogusField') });
  });

  it('loads credentials before creating a client (auth errors stay on the awaited path)', async () => {
    const loadClient = vi.fn();
    const failing = Object.assign(new Error('Cannot load credentials'), { kind: 'auth' });
    await expect(
      executeApiCall(
        { service: 'admin', method: 'listAccounts', body: {}, interactive: false },
        { loadClient, ensureCredentials: async () => Promise.reject(failing) },
      ),
    ).rejects.toBe(failing);
    expect(loadClient).not.toHaveBeenCalled();
  });
});
