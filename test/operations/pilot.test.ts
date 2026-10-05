import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/data-api.service.js', () => ({
  runReport: vi.fn(),
  getMetadata: vi.fn(),
}));
const adminClient = {
  listCustomDimensions: vi.fn(),
  getCustomDimension: vi.fn(),
  createCustomDimension: vi.fn(),
  updateCustomDimension: vi.fn(),
  archiveCustomDimension: vi.fn(),
};
vi.mock('../../src/services/admin-api.service.js', () => ({
  getAdminClient: vi.fn(async () => adminClient),
}));

const dataApi = await import('../../src/services/data-api.service.js');
const { reportRun } = await import('../../src/operations/report/run.op.js');
const { metadataGet } = await import('../../src/operations/metadata/get.op.js');
const cd = await import('../../src/operations/admin/custom-dimensions.op.js');
const { OPERATIONS } = await import('../../src/operations/index.js');

const ctx = { property: '123', globals: {} as never, interactive: false };
const report = { headers: ['country', 'sessions'], rows: [['RO', '1']], rowCount: 1 };
const dim = {
  name: 'properties/123/customDimensions/1',
  parameterName: 'plan',
  displayName: 'Plan',
  scope: 'EVENT',
};

beforeEach(() => {
  vi.mocked(dataApi.runReport).mockReset().mockResolvedValue(report);
  for (const fn of Object.values(adminClient)) fn.mockReset();
});

describe('report.run', () => {
  it('builds the RunReport request like 1.x and coerces numbers', async () => {
    const input = reportRun.input.parse({
      metrics: ['sessions'],
      dimensions: ['country'],
      orderBy: ['metric:sessions:desc', 'dimension:country'],
      limit: '10',
      dimensionFilter: ['country==RO'],
    });
    const out = await reportRun.run(input, ctx);
    const params = vi.mocked(dataApi.runReport).mock.calls[0][0];
    expect(params.property).toBe('properties/123');
    expect(params.metrics).toEqual([{ name: 'sessions' }]);
    expect(params.dimensions).toEqual([{ name: 'country' }]);
    expect(params.limit).toBe(10);
    expect(params.orderBys).toEqual([
      { metric: { metricName: 'sessions' }, desc: true },
      { dimension: { dimensionName: 'country' }, desc: false },
    ]);
    expect(params.dimensionFilter).toBeDefined();
    expect(params.keepEmptyRows).toBe(false);
    expect(reportRun.output.safeParse(out).success).toBe(true);
  });

  it('rejects a malformed --order-by', async () => {
    const input = reportRun.input.parse({ metrics: ['s'], orderBy: ['sessions'] });
    await expect(reportRun.run(input, ctx)).rejects.toThrow(/order-by/);
  });
});

describe('metadata.get', () => {
  it('filters by type and search like 1.x', async () => {
    vi.mocked(dataApi.getMetadata).mockResolvedValue({
      dimensions: [
        { apiName: 'country', uiName: 'Country', customDefinition: false },
        { apiName: 'city', uiName: 'City', customDefinition: false },
      ],
      metrics: [{ apiName: 'countryCount', uiName: 'x', customDefinition: true }],
    } as never);
    const out = await metadataGet.run(metadataGet.input.parse({ type: 'dims', search: 'coun' }), ctx);
    expect(out).toEqual([expect.objectContaining({ type: 'dimension', apiName: 'country' })]);
    expect(metadataGet.output.safeParse(out).success).toBe(true);
  });
});

describe('admin.custom-dimensions', () => {
  it('list calls the admin client with the property parent', async () => {
    adminClient.listCustomDimensions.mockResolvedValue([[dim]]);
    const out = await cd.listCustomDimensions.run(cd.listCustomDimensions.input.parse({}), ctx);
    expect(adminClient.listCustomDimensions).toHaveBeenCalledWith({ parent: 'properties/123' });
    expect(cd.listCustomDimensions.output.safeParse(out).success).toBe(true);
  });

  it('update sends only the provided fields in the update mask', async () => {
    adminClient.updateCustomDimension.mockResolvedValue([dim]);
    await cd.updateCustomDimension.run(
      cd.updateCustomDimension.input.parse({ name: dim.name, displayName: 'New' }),
      ctx,
    );
    expect(adminClient.updateCustomDimension).toHaveBeenCalledWith({
      customDimension: { name: dim.name, displayName: 'New' },
      updateMask: { paths: ['display_name'] },
    });
  });

  it('create passes parent and body', async () => {
    adminClient.createCustomDimension.mockResolvedValue([dim]);
    await cd.createCustomDimension.run(
      cd.createCustomDimension.input.parse({ parameterName: 'plan', displayName: 'Plan', scope: 'EVENT' }),
      ctx,
    );
    expect(adminClient.createCustomDimension).toHaveBeenCalledWith({
      parent: 'properties/123',
      customDimension: expect.objectContaining({
        parameterName: 'plan',
        displayName: 'Plan',
        scope: 'EVENT',
      }),
    });
  });

  it('archive is a delete-category op and calls archive with the name', async () => {
    adminClient.archiveCustomDimension.mockResolvedValue([{}]);
    expect(cd.archiveCustomDimension.category).toBe('delete');
    const out = await cd.archiveCustomDimension.run(
      cd.archiveCustomDimension.input.parse({ name: dim.name }),
      ctx,
    );
    expect(adminClient.archiveCustomDimension).toHaveBeenCalledWith({ name: dim.name });
    expect(out).toEqual({ name: dim.name, archived: true });
  });

  it('rejects an invalid scope', () => {
    expect(() =>
      cd.createCustomDimension.input.parse({ parameterName: 'p', displayName: 'd', scope: 'NOPE' }),
    ).toThrow();
  });
});

describe('OPERATIONS catalogue', () => {
  it('registers the pilot operations with unique ids', () => {
    const ids = OPERATIONS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining([
        'report.run',
        'metadata.get',
        'admin.custom-dimensions.list',
        'admin.custom-dimensions.get',
        'admin.custom-dimensions.create',
        'admin.custom-dimensions.update',
        'admin.custom-dimensions.archive',
      ]),
    );
  });
});
