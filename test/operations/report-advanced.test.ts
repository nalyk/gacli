import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/data-api.service.js', () => ({
  runPivotReport: vi.fn(),
  batchRunReports: vi.fn(),
  batchRunPivotReports: vi.fn(),
  runRealtimeReport: vi.fn(),
  runCohortReport: vi.fn(),
  runFunnelReport: vi.fn(),
}));

const dataApi = await import('../../src/services/data-api.service.js');
const { describeFlags } = await import('../../src/core/cli-adapter.js');
const { reportBatch } = await import('../../src/operations/report/batch.op.js');
const { reportBatchPivot } = await import('../../src/operations/report/batch-pivot.op.js');
const { reportPivot } = await import('../../src/operations/report/pivot.op.js');
const { reportRealtime } = await import('../../src/operations/report/realtime.op.js');
const { reportCohort } = await import('../../src/operations/report/cohort.op.js');
const { reportFunnel } = await import('../../src/operations/report/funnel.op.js');
const { reportOps } = await import('../../src/operations/report/index.js');

const ctx = { property: '123', globals: {} as never, interactive: false };
const report = { headers: ['country', 'sessions'], rows: [['RO', '1']], rowCount: 1 };

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

function tmpJson(name: string, content: string): string {
  const f = join(mkdtempSync(join(tmpdir(), 'gacli-report-')), name);
  writeFileSync(f, content);
  return f;
}

beforeEach(() => {
  vi.mocked(dataApi.runPivotReport).mockReset().mockResolvedValue(report);
  vi.mocked(dataApi.batchRunReports).mockReset().mockResolvedValue([report, report]);
  vi.mocked(dataApi.batchRunPivotReports).mockReset().mockResolvedValue([report]);
  vi.mocked(dataApi.runRealtimeReport).mockReset().mockResolvedValue(report);
  vi.mocked(dataApi.runCohortReport).mockReset().mockResolvedValue(report);
  vi.mocked(dataApi.runFunnelReport).mockReset().mockResolvedValue(report);
});

describe('report catalogue', () => {
  it('exports the ops in 1.x order with read category and property requirement', () => {
    expect(reportOps.map((o) => o.id)).toEqual([
      'report.pivot',
      'report.batch',
      'report.batch-pivot',
      'report.realtime',
      'report.cohort',
      'report.funnel',
    ]);
    for (const op of reportOps) {
      expect(op.category).toBe('read');
      expect(op.needsProperty).toBe(true);
    }
  });

  it.each([
    ['report_pivot.txt', 'report.pivot'],
    ['report_batch.txt', 'report.batch'],
    ['report_batch-pivot.txt', 'report.batch-pivot'],
    ['report_realtime.txt', 'report.realtime'],
    ['report_cohort.txt', 'report.cohort'],
    ['report_funnel.txt', 'report.funnel'],
  ])('%s flags are all accepted by %s', (file, id) => {
    const op = reportOps.find((o) => o.id === id);
    expect(op).toBeDefined();
    const flags = describeFlags(op as NonNullable<typeof op>).map((s) => s.flag);
    for (const flag of fixtureFlags(file)) expect(flags).toContain(flag);
  });
});

describe('report.batch', () => {
  const requests = [
    { metrics: [{ name: 'sessions' }], dateRanges: [{ startDate: 'today', endDate: 'today' }] },
  ];

  it('reads the requests file (1.x path semantics) and calls batchRunReports', async () => {
    const f = tmpJson('batch.json', JSON.stringify(requests));
    const out = await reportBatch.run(reportBatch.input.parse({ requests: f }), ctx);
    expect(dataApi.batchRunReports).toHaveBeenCalledWith('123', { requests });
    expect(reportBatch.kind).toBe('reports');
    expect(reportBatch.output.safeParse(out).success).toBe(true);
  });

  it('accepts @path too', () => {
    const f = tmpJson('batch.json', JSON.stringify(requests));
    expect(reportBatch.input.parse({ requests: `@${f}` }).requests).toEqual(requests);
  });

  it('a missing file is a usage error naming the path', () => {
    const r = reportBatch.input.safeParse({ requests: '/nope/missing.json' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/\/nope\/missing\.json/);
  });

  it('invalid JSON is a usage error naming the path', () => {
    const f = tmpJson('bad.json', '[{');
    const r = reportBatch.input.safeParse({ requests: f });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toContain(f);
  });
});

describe('report.batch-pivot', () => {
  it('reads the requests file and calls batchRunPivotReports', async () => {
    const requests = [{ metrics: [{ name: 'sessions' }], pivots: [{ fieldNames: ['country'], limit: 5 }] }];
    const f = tmpJson('bp.json', JSON.stringify(requests));
    const out = await reportBatchPivot.run(reportBatchPivot.input.parse({ requests: f }), ctx);
    expect(dataApi.batchRunPivotReports).toHaveBeenCalledWith('123', { requests });
    expect(reportBatchPivot.kind).toBe('reports');
    expect(reportBatchPivot.output.safeParse(out).success).toBe(true);
  });
});

describe('report.pivot', () => {
  const pivot = { fieldNames: ['country'], limit: 5 };

  it('builds the RunPivotReport request like 1.x', async () => {
    const out = await reportPivot.run(
      reportPivot.input.parse({
        metrics: ['sessions'],
        dimensions: ['country'],
        pivots: JSON.stringify([pivot]),
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        dimensionFilter: ['country==RO'],
      }),
      ctx,
    );
    expect(dataApi.runPivotReport).toHaveBeenCalledWith({
      property: 'properties/123',
      dateRanges: [{ startDate: '2024-01-01', endDate: '2024-01-31' }],
      metrics: [{ name: 'sessions' }],
      dimensions: [{ name: 'country' }],
      pivots: [pivot],
      dimensionFilter: {
        filter: { fieldName: 'country', stringFilter: { matchType: 'EXACT', value: 'RO' } },
      },
      metricFilter: undefined,
    });
    expect(reportPivot.output.safeParse(out).success).toBe(true);
  });

  it('applies the 1.x date defaults and wraps a single pivot object', () => {
    const input = reportPivot.input.parse({
      metrics: ['s'],
      dimensions: ['d'],
      pivots: JSON.stringify(pivot),
    });
    expect(input.startDate).toBe('7daysAgo');
    expect(input.endDate).toBe('today');
    expect(input.pivots).toEqual([pivot]);
  });

  it('rejects a pivot without fieldNames', () => {
    const r = reportPivot.input.safeParse({ metrics: ['s'], dimensions: ['d'], pivots: '[{"limit":5}]' });
    expect(r.success).toBe(false);
  });
});

describe('report.realtime minute ranges', () => {
  it('accepts up to 59 minutes ago (Analytics 360)', () => {
    expect(
      reportRealtime.input.safeParse({
        metrics: ['activeUsers'],
        minuteRanges: JSON.stringify([{ startMinutesAgo: 59, endMinutesAgo: 0 }]),
      }).success,
    ).toBe(true);
  });

  it('rejects 60 minutes ago', () => {
    expect(
      reportRealtime.input.safeParse({
        metrics: ['a'],
        minuteRanges: JSON.stringify([{ startMinutesAgo: 60 }]),
      }).success,
    ).toBe(false);
  });
});

describe('report.realtime', () => {
  it('builds the RunRealtimeReport request like 1.x', async () => {
    const minuteRanges = [{ startMinutesAgo: 10, endMinutesAgo: 0 }];
    const out = await reportRealtime.run(
      reportRealtime.input.parse({
        metrics: ['activeUsers'],
        dimensions: ['country'],
        minuteRanges: JSON.stringify(minuteRanges),
        metricFilter: ['activeUsers>5'],
        limit: '10',
      }),
      ctx,
    );
    const params = vi.mocked(dataApi.runRealtimeReport).mock.calls[0][0];
    expect(params).toEqual({
      property: 'properties/123',
      metrics: [{ name: 'activeUsers' }],
      dimensions: [{ name: 'country' }],
      minuteRanges,
      dimensionFilter: undefined,
      metricFilter: expect.objectContaining({
        filter: expect.objectContaining({ fieldName: 'activeUsers' }),
      }),
      limit: 10,
    });
    expect(reportRealtime.output.safeParse(out).success).toBe(true);
  });

  it('leaves optional parts undefined', async () => {
    await reportRealtime.run(reportRealtime.input.parse({ metrics: ['activeUsers'] }), ctx);
    expect(dataApi.runRealtimeReport).toHaveBeenCalledWith({
      property: 'properties/123',
      metrics: [{ name: 'activeUsers' }],
      dimensions: undefined,
      minuteRanges: undefined,
      dimensionFilter: undefined,
      metricFilter: undefined,
      limit: undefined,
    });
  });

  it('rejects a non-numeric --limit', () => {
    expect(reportRealtime.input.safeParse({ metrics: ['a'], limit: 'x' }).success).toBe(false);
  });
});

describe('report.cohort', () => {
  const cohorts = [
    {
      name: 'c1',
      dimension: 'firstSessionDate',
      dateRange: { startDate: '2024-01-01', endDate: '2024-01-07' },
    },
  ];

  it('builds the cohort request with 1.x defaults (DAILY, endOffset 5)', async () => {
    const out = await reportCohort.run(
      reportCohort.input.parse({ metrics: ['cohortActiveUsers'], cohorts: JSON.stringify(cohorts) }),
      ctx,
    );
    expect(dataApi.runCohortReport).toHaveBeenCalledWith({
      property: 'properties/123',
      metrics: [{ name: 'cohortActiveUsers' }],
      dimensions: undefined,
      cohortSpec: {
        cohorts,
        cohortsRange: { granularity: 'DAILY', startOffset: undefined, endOffset: 5 },
      },
      accumulate: false,
    });
    expect(reportCohort.output.safeParse(out).success).toBe(true);
  });

  it('passes granularity, offsets, dimensions and accumulate', async () => {
    await reportCohort.run(
      reportCohort.input.parse({
        metrics: ['m'],
        cohorts: JSON.stringify(cohorts),
        cohortGranularity: 'WEEKLY',
        startOffset: '0',
        endOffset: '3',
        dimensions: ['cohort'],
        accumulate: true,
      }),
      ctx,
    );
    expect(dataApi.runCohortReport).toHaveBeenCalledWith(
      expect.objectContaining({
        dimensions: [{ name: 'cohort' }],
        cohortSpec: { cohorts, cohortsRange: { granularity: 'WEEKLY', startOffset: 0, endOffset: 3 } },
        accumulate: true,
      }),
    );
  });

  it('rejects an unknown granularity', () => {
    const r = reportCohort.input.safeParse({ metrics: ['m'], cohorts: '[]', cohortGranularity: 'HOURLY' });
    expect(r.success).toBe(false);
  });
});

describe('report.funnel', () => {
  const steps = [{ name: 'view' }, { name: 'buy', isDirectlyFollowedBy: true }];

  it('passes a Duration object for withinDurationFromPriorStep and converts "Ns" strings', () => {
    const parsed = reportFunnel.input.parse({
      steps: JSON.stringify([
        { name: 'a' },
        { name: 'b', withinDurationFromPriorStep: { seconds: 10 } },
        { name: 'c', withinDurationFromPriorStep: '90s' },
        { name: 'd', withinDurationFromPriorStep: '1.5s' },
      ]),
    });
    const durations = (parsed.steps as { withinDurationFromPriorStep?: unknown }[]).map(
      (s) => s.withinDurationFromPriorStep,
    );
    expect(durations).toEqual([
      undefined,
      { seconds: 10 },
      { seconds: 90 },
      { seconds: 1, nanos: 500_000_000 },
    ]);
  });

  it('rejects a malformed duration string', () => {
    expect(
      reportFunnel.input.safeParse({
        steps: JSON.stringify([{ name: 'a', withinDurationFromPriorStep: 'ten' }]),
      }).success,
    ).toBe(false);
  });

  it('builds the funnel request like 1.x', async () => {
    const out = await reportFunnel.run(
      reportFunnel.input.parse({
        steps: JSON.stringify(steps),
        openFunnel: true,
        funnelBreakdown: 'deviceCategory',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      }),
      ctx,
    );
    expect(dataApi.runFunnelReport).toHaveBeenCalledWith({
      property: 'properties/123',
      dateRanges: [{ startDate: '2024-01-01', endDate: '2024-01-31' }],
      funnel: { steps, isOpenFunnel: true },
      funnelBreakdown: { breakdownDimension: { name: 'deviceCategory' } },
    });
    expect(reportFunnel.output.safeParse(out).success).toBe(true);
  });

  it('defaults to a closed funnel without breakdown', async () => {
    await reportFunnel.run(
      reportFunnel.input.parse({
        steps: JSON.stringify(steps),
        startDate: '2024-01-01',
        endDate: '2024-01-02',
      }),
      ctx,
    );
    expect(dataApi.runFunnelReport).toHaveBeenCalledWith(
      expect.objectContaining({ funnel: { steps, isOpenFunnel: false }, funnelBreakdown: undefined }),
    );
  });

  it('rejects malformed --steps JSON', () => {
    const r = reportFunnel.input.safeParse({ steps: '[{' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/--steps/);
  });
});
