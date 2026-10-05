import { beforeEach, describe, expect, it, vi } from 'vitest';

const alpha = {
  getPropertyQuotasSnapshot: vi.fn(),
  createReportTask: vi.fn(),
  getReportTask: vi.fn(),
  listReportTasks: vi.fn(),
  queryReportTask: vi.fn(),
  chat: vi.fn(),
  runReport: vi.fn(),
};

vi.mock('@google-analytics/data', () => ({
  BetaAnalyticsDataClient: vi.fn(),
  v1alpha: {
    AlphaAnalyticsDataClient: vi.fn(function AlphaAnalyticsDataClient() {
      return alpha;
    }),
  },
}));
vi.mock('../../src/services/auth.service.js', () => ({
  getAuthClientOptions: vi.fn(() => ({})),
  ensureCredentials: vi.fn(async () => undefined),
}));

const svc = await import('../../src/services/data-api.service.js');

const rawReport = {
  dimensionHeaders: [{ name: 'country' }],
  metricHeaders: [{ name: 'sessions' }],
  rows: [{ dimensionValues: [{ value: 'RO' }], metricValues: [{ value: '5' }] }],
  rowCount: 1,
  metadata: null,
};

beforeEach(() => {
  for (const fn of Object.values(alpha)) fn.mockReset();
});

describe('data-api.service phase 4 (v1alpha client)', () => {
  it('getPropertyQuotasSnapshot uses the propertyQuotasSnapshot resource name', async () => {
    alpha.getPropertyQuotasSnapshot.mockResolvedValue([{ name: 'properties/1/propertyQuotasSnapshot' }]);
    await svc.getPropertyQuotasSnapshot('1');
    expect(alpha.getPropertyQuotasSnapshot).toHaveBeenCalledWith({
      name: 'properties/1/propertyQuotasSnapshot',
    });
  });

  it('createReportTask sends parent + reportTask and returns the LRO', async () => {
    const op = { name: 'properties/1/reportTasks/x', done: false };
    alpha.createReportTask.mockResolvedValue([op]);
    const reportTask = { reportDefinition: { metrics: [{ name: 'sessions' }] } };
    expect(await svc.createReportTask('1', reportTask)).toBe(op);
    expect(alpha.createReportTask).toHaveBeenCalledWith({ parent: 'properties/1', reportTask });
  });

  it('getReportTask / listReportTasks', async () => {
    alpha.getReportTask.mockResolvedValue([{ name: 'n' }]);
    alpha.listReportTasks.mockResolvedValue([[{ name: 'n' }]]);
    expect(await svc.getReportTask('n')).toEqual({ name: 'n' });
    expect(alpha.getReportTask).toHaveBeenCalledWith({ name: 'n' });
    expect(await svc.listReportTasks('1')).toEqual([{ name: 'n' }]);
    expect(alpha.listReportTasks).toHaveBeenCalledWith({ parent: 'properties/1' });
  });

  it('queryReportTask passes limit/offset only when given and returns ReportData', async () => {
    alpha.queryReportTask.mockResolvedValue([rawReport]);
    const out = await svc.queryReportTask('n', 10, 5);
    expect(alpha.queryReportTask).toHaveBeenCalledWith({ name: 'n', limit: 10, offset: 5 });
    expect(out).toMatchObject({ headers: ['country', 'sessions'], rows: [['RO', '5']], rowCount: 1 });
    await svc.queryReportTask('n');
    expect(alpha.queryReportTask).toHaveBeenLastCalledWith({ name: 'n' });
  });

  it('chat forwards the request', async () => {
    alpha.chat.mockResolvedValue([{ sessionId: 's', blocks: [] }]);
    const req = { property: 'properties/1', userQuery: 'q', sessionId: 's' };
    expect(await svc.chat(req)).toEqual({ sessionId: 's', blocks: [] });
    expect(alpha.chat).toHaveBeenCalledWith(req);
  });

  it('runReportAlpha calls the v1alpha runReport and keeps the property quota', async () => {
    const propertyQuota = { tokensPerDay: { consumed: 1, remaining: 9 } };
    alpha.runReport.mockResolvedValue([{ ...rawReport, propertyQuota }]);
    const params = {
      property: 'properties/1',
      dateRanges: [{ startDate: 'today', endDate: 'today' }],
      metrics: [{ name: 'sessions' }],
      conversionSpec: { attributionModel: 'DATA_DRIVEN' as const },
    };
    const out = await svc.runReportAlpha(params);
    expect(alpha.runReport).toHaveBeenCalledWith(params);
    expect(out.metadata).toEqual({ propertyQuota });
  });
});

describe('toReportData metadata (phase 4)', () => {
  it('copies propertyQuota and non-empty dataTruncationReasons', () => {
    const reasons = [{ dataTruncationType: 'DATA_TRUNCATION_TYPE_DATE_RANGE' }];
    const propertyQuota = { tokensPerDay: { consumed: 1, remaining: 9 } };
    const r = svc.toReportData({
      metadata: { currencyCode: 'USD', dataTruncationReasons: reasons },
      propertyQuota,
    });
    expect(r.metadata).toEqual({ currencyCode: 'USD', dataTruncationReasons: reasons, propertyQuota });
  });

  it('drops empty dataTruncationReasons and a null propertyQuota', () => {
    const r = svc.toReportData({
      metadata: { currencyCode: 'USD', dataTruncationReasons: [] },
      propertyQuota: null,
    });
    expect(r.metadata).toEqual({ currencyCode: 'USD' });
  });

  it('keeps metadata undefined when there is nothing to report', () => {
    expect(svc.toReportData({ propertyQuota: null }).metadata).toBeUndefined();
  });
});
