import { Command } from 'commander';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/data-api.service.js', () => ({
  runReport: vi.fn(),
  runReportAlpha: vi.fn(),
  getPropertyQuotasSnapshot: vi.fn(),
  createReportTask: vi.fn(),
  getReportTask: vi.fn(),
  listReportTasks: vi.fn(),
  queryReportTask: vi.fn(),
  chat: vi.fn(),
}));

const dataApi = await import('../../src/services/data-api.service.js');
const { GacliError } = await import('../../src/core/errors.js');
const { mountOperations } = await import('../../src/core/cli-adapter.js');
const { reportRun } = await import('../../src/operations/report/run.op.js');
const { reportQuota } = await import('../../src/operations/report/quota.op.js');
const tasks = await import('../../src/operations/report/tasks.op.js');
const { reportChat } = await import('../../src/operations/report/chat.op.js');
const { reportOps } = await import('../../src/operations/report/index.js');

const ctx = { property: '123', globals: {} as never, interactive: false };
const report = { headers: ['country', 'sessions'], rows: [['RO', '1']], rowCount: 1 };
const quota = (consumed: number, remaining: number) => ({ consumed, remaining });
const propertyQuota = {
  tokensPerDay: quota(10, 199_990),
  tokensPerHour: quota(10, 39_990),
  concurrentRequests: quota(0, 10),
  serverErrorsPerProjectPerHour: quota(0, 10),
  potentiallyThresholdedRequestsPerHour: quota(0, 120),
  tokensPerProjectPerHour: quota(10, 13_990),
};
const task = {
  name: 'properties/123/reportTasks/abc',
  reportDefinition: {
    metrics: [{ name: 'sessions' }],
    dimensions: [{ name: 'country' }],
    dateRanges: [{ startDate: '2026-01-01', endDate: '2026-01-31' }],
    limit: '1000',
  },
  reportMetadata: {
    state: 'ACTIVE',
    beginCreatingTime: { seconds: '1767225600', nanos: 0 },
    creationQuotaTokensCharged: 12,
    taskRowCount: 42,
    totalRowCount: 42,
  },
};

beforeEach(() => {
  for (const fn of Object.values(dataApi)) vi.mocked(fn as (...a: unknown[]) => unknown).mockReset();
  vi.mocked(dataApi.runReport).mockResolvedValue(report);
  vi.mocked(dataApi.runReportAlpha).mockResolvedValue(report);
});

describe('report catalogue (phase 4)', () => {
  it('appends quota, tasks and chat after the 1.x ops', () => {
    expect(reportOps.map((o) => o.id).slice(-6)).toEqual([
      'report.quota',
      'report.tasks.create',
      'report.tasks.get',
      'report.tasks.list',
      'report.tasks.query',
      'report.chat',
    ]);
  });

  it('categories and property requirements', () => {
    expect([reportQuota.category, reportQuota.needsProperty]).toEqual(['read', true]);
    expect([tasks.reportTasksCreate.category, tasks.reportTasksCreate.needsProperty]).toEqual([
      'create',
      true,
    ]);
    expect([tasks.reportTasksGet.category, tasks.reportTasksGet.needsProperty]).toEqual(['read', undefined]);
    expect([tasks.reportTasksList.category, tasks.reportTasksList.needsProperty]).toEqual(['read', true]);
    expect([tasks.reportTasksQuery.category, tasks.reportTasksQuery.needsProperty]).toEqual([
      'read',
      undefined,
    ]);
    expect(tasks.reportTasksQuery.kind).toBe('report');
    expect([reportChat.category, reportChat.needsProperty]).toEqual(['read', true]);
  });

  it('mounts on a fresh program with flags matching the input keys', () => {
    const program = new Command('gacli');
    const ops = [reportRun, ...reportOps];
    mountOperations(program, ops);
    const report = program.commands.find((c) => c.name() === 'report');
    const tasksCmd = report?.commands.find((c) => c.name() === 'tasks');
    expect(tasksCmd?.commands.map((c) => c.name())).toEqual(['create', 'get', 'list', 'query']);
    for (const op of ops) {
      const keys = Object.keys(op.input.shape);
      for (const key of Object.keys(op.flags ?? {})) expect(keys).toContain(key);
    }
    const run = report?.commands.find((c) => c.name() === 'run');
    const runFlags = run?.options.map((o) => o.long);
    expect(runFlags).toContain('--return-property-quota');
    expect(runFlags).toContain('--conversion-spec');
    const chatFlags = report?.commands.find((c) => c.name() === 'chat')?.options.map((o) => o.long);
    expect(chatFlags).toEqual(expect.arrayContaining(['--question', '--session']));
  });
});

describe('report.run phase 4 flags', () => {
  it('--return-property-quota requests returnPropertyQuota on v1beta', async () => {
    await reportRun.run(reportRun.input.parse({ metrics: ['sessions'], returnPropertyQuota: true }), ctx);
    expect(vi.mocked(dataApi.runReport).mock.calls[0][0].returnPropertyQuota).toBe(true);
    expect(dataApi.runReportAlpha).not.toHaveBeenCalled();
  });

  it('omits returnPropertyQuota by default', async () => {
    await reportRun.run(reportRun.input.parse({ metrics: ['sessions'] }), ctx);
    expect(vi.mocked(dataApi.runReport).mock.calls[0][0]).not.toHaveProperty('returnPropertyQuota', true);
  });

  it('--conversion-spec routes through the v1alpha runReport with conversionSpec', async () => {
    const out = await reportRun.run(
      reportRun.input.parse({
        metrics: ['conversions'],
        conversionSpec: '{"conversionActions":["conversionActions/1"],"attributionModel":"LAST_CLICK"}',
      }),
      ctx,
    );
    expect(dataApi.runReport).not.toHaveBeenCalled();
    const params = vi.mocked(dataApi.runReportAlpha).mock.calls[0][0];
    expect(params.property).toBe('properties/123');
    expect(params.metrics).toEqual([{ name: 'conversions' }]);
    expect(params.conversionSpec).toEqual({
      conversionActions: ['conversionActions/1'],
      attributionModel: 'LAST_CLICK',
    });
    expect(reportRun.output.safeParse(out).success).toBe(true);
  });

  it('rejects an unknown attribution model as a usage error', () => {
    const r = reportRun.input.safeParse({ metrics: ['s'], conversionSpec: '{"attributionModel":"FIRST"}' });
    expect(r.success).toBe(false);
  });

  it('rejects malformed --conversion-spec JSON', () => {
    const r = reportRun.input.safeParse({ metrics: ['s'], conversionSpec: '{' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/Invalid JSON/);
  });
});

describe('report.quota', () => {
  it('fetches the snapshot for the property and renders consumed/remaining columns', async () => {
    const snapshot = {
      name: 'properties/123/propertyQuotasSnapshot',
      corePropertyQuota: propertyQuota,
      realtimePropertyQuota: propertyQuota,
      funnelPropertyQuota: null,
    };
    vi.mocked(dataApi.getPropertyQuotasSnapshot).mockResolvedValue(snapshot as never);
    const out = await reportQuota.run(reportQuota.input.parse({}), ctx);
    expect(dataApi.getPropertyQuotasSnapshot).toHaveBeenCalledWith('123');
    expect(reportQuota.kind).toBe('resource');
    expect(reportQuota.output.safeParse(out).success).toBe(true);
    const cols = reportQuota.columns ?? [];
    expect(cols[0]).toMatchObject({ header: 'Name', path: 'name' });
    const coreDay = cols.find((c) => c.path === 'corePropertyQuota.tokensPerDay');
    expect(coreDay?.format?.(propertyQuota.tokensPerDay)).toBe('10 / 199990');
    expect(coreDay?.format?.(undefined)).toBe('');
    const paths = cols.map((c) => c.path);
    for (const family of ['corePropertyQuota', 'realtimePropertyQuota', 'funnelPropertyQuota']) {
      for (const q of [
        'tokensPerDay',
        'tokensPerHour',
        'concurrentRequests',
        'serverErrorsPerProjectPerHour',
        'potentiallyThresholdedRequestsPerHour',
      ]) {
        expect(paths).toContain(`${family}.${q}`);
      }
    }
  });
});

describe('report.tasks.create', () => {
  const input = {
    metrics: ['sessions'],
    dimensions: ['country'],
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    limit: '1000',
    dimensionFilter: ['country==RO'],
  };

  it('builds reportTask.reportDefinition and returns without blocking', async () => {
    const promise = vi.fn();
    vi.mocked(dataApi.createReportTask).mockResolvedValue({
      name: 'properties/123/reportTasks/abc',
      done: false,
      promise,
    } as never);
    const out = await tasks.reportTasksCreate.run(tasks.reportTasksCreate.input.parse(input), ctx);
    expect(dataApi.createReportTask).toHaveBeenCalledWith('123', {
      reportDefinition: {
        metrics: [{ name: 'sessions' }],
        dimensions: [{ name: 'country' }],
        dateRanges: [{ startDate: '2026-01-01', endDate: '2026-01-31' }],
        dimensionFilter: expect.objectContaining({ filter: expect.anything() }),
        limit: 1000,
      },
    });
    expect(promise).not.toHaveBeenCalled();
    expect(out).toEqual({ name: 'properties/123/reportTasks/abc', done: false });
    expect(tasks.reportTasksCreate.output.safeParse(out).success).toBe(true);
  });

  it('--watch awaits the LRO and returns the finished task', async () => {
    vi.mocked(dataApi.createReportTask).mockResolvedValue({
      name: 'properties/123/reportTasks/abc',
      done: false,
      promise: vi.fn(async () => [task, {}, {}]),
    } as never);
    const out = await tasks.reportTasksCreate.run(
      tasks.reportTasksCreate.input.parse({ ...input, watch: true }),
      ctx,
    );
    expect(out).toMatchObject({ ...task, done: true });
    expect(tasks.reportTasksCreate.output.safeParse(out).success).toBe(true);
  });

  it('requires --metrics', () => {
    expect(tasks.reportTasksCreate.input.safeParse({}).success).toBe(false);
  });
});

describe('report.tasks get/list/query', () => {
  it('get passes the name and returns the task', async () => {
    vi.mocked(dataApi.getReportTask).mockResolvedValue(task as never);
    const out = await tasks.reportTasksGet.run(tasks.reportTasksGet.input.parse({ name: task.name }), ctx);
    expect(dataApi.getReportTask).toHaveBeenCalledWith(task.name);
    expect(tasks.reportTasksGet.output.safeParse(out).success).toBe(true);
    expect(tasks.reportTasksGet.columns?.[0]).toMatchObject({ header: 'Name', path: 'name' });
  });

  it('list uses the property', async () => {
    vi.mocked(dataApi.listReportTasks).mockResolvedValue([task] as never);
    const out = await tasks.reportTasksList.run(tasks.reportTasksList.input.parse({}), ctx);
    expect(dataApi.listReportTasks).toHaveBeenCalledWith('123');
    expect(tasks.reportTasksList.output.safeParse(out).success).toBe(true);
  });

  it('query coerces --limit/--offset and returns ReportData', async () => {
    vi.mocked(dataApi.queryReportTask).mockResolvedValue(report);
    const out = await tasks.reportTasksQuery.run(
      tasks.reportTasksQuery.input.parse({ name: task.name, limit: '50', offset: '10' }),
      ctx,
    );
    expect(dataApi.queryReportTask).toHaveBeenCalledWith(task.name, 50, 10);
    expect(tasks.reportTasksQuery.output.safeParse(out).success).toBe(true);
  });

  it('query surfaces the API error of an unfinished task', async () => {
    vi.mocked(dataApi.queryReportTask).mockRejectedValue(
      new Error('9 FAILED_PRECONDITION: task is CREATING'),
    );
    await expect(
      tasks.reportTasksQuery.run(tasks.reportTasksQuery.input.parse({ name: task.name }), ctx),
    ).rejects.toThrow(/CREATING/);
  });

  it('query requires --name', () => {
    expect(tasks.reportTasksQuery.input.safeParse({}).success).toBe(false);
  });
});

describe('report.chat', () => {
  const response = {
    sessionId: 'sess-1',
    blocks: [
      { text: 'You had 120 sessions.' },
      {
        table: {
          headers: [
            { header: 'country', dataType: 'STRING' },
            { header: 'sessions', dataType: 'INTEGER' },
          ],
          rows: [{ columns: [{ value: 'RO' }, { value: '120' }] }],
        },
      },
    ],
    propertyQuota: null,
  };

  it('sends property, userQuery and sessionId; renders blocks as text', async () => {
    vi.mocked(dataApi.chat).mockResolvedValue(response as never);
    const out = await reportChat.run(
      reportChat.input.parse({ question: 'How many sessions?', session: 'sess-1' }),
      ctx,
    );
    expect(dataApi.chat).toHaveBeenCalledWith({
      property: 'properties/123',
      userQuery: 'How many sessions?',
      sessionId: 'sess-1',
    });
    expect(out.sessionId).toBe('sess-1');
    expect(out.text).toBe('You had 120 sessions.\n\ncountry | sessions\nRO | 120');
    expect(out.blocks).toEqual(response.blocks);
    expect(reportChat.output.safeParse(out).success).toBe(true);
    expect(reportChat.columns?.map((c) => c.path)).toEqual(['text', 'sessionId']);
  });

  it('starts a new session when --session is absent', async () => {
    vi.mocked(dataApi.chat).mockResolvedValue(response as never);
    await reportChat.run(reportChat.input.parse({ question: 'Hi' }), ctx);
    expect(dataApi.chat).toHaveBeenCalledWith({ property: 'properties/123', userQuery: 'Hi' });
  });

  it('requires --question', () => {
    expect(reportChat.input.safeParse({}).success).toBe(false);
  });

  it.each([
    ['7 PERMISSION_DENIED: Request had insufficient authentication scopes.'],
    ['16 UNAUTHENTICATED: missing scope analytics.chatbot.read'],
  ])('maps a scope error to an auth GacliError with a hint (%s)', async (msg) => {
    vi.mocked(dataApi.chat).mockRejectedValue(new Error(msg));
    const err = await reportChat.run(reportChat.input.parse({ question: 'Hi' }), ctx).catch((e) => e);
    expect(err).toBeInstanceOf(GacliError);
    expect(err.kind).toBe('auth');
    expect(err.hint).toMatch(/auth login --scopes chat/);
    expect(err.hint).toMatch(/GACLI_SCOPES=chat/);
  });

  it('passes other permission errors through unchanged', async () => {
    const e = new Error('7 PERMISSION_DENIED: User does not have sufficient permissions for this property.');
    vi.mocked(dataApi.chat).mockRejectedValue(e);
    await expect(reportChat.run(reportChat.input.parse({ question: 'Hi' }), ctx)).rejects.toBe(e);
  });
});
