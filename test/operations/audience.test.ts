import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/data-api.service.js', () => ({
  createAudienceExport: vi.fn(),
  getAudienceExport: vi.fn(),
  listAudienceExports: vi.fn(),
  queryAudienceExport: vi.fn(),
  createRecurringAudienceList: vi.fn(),
  getRecurringAudienceList: vi.fn(),
  listRecurringAudienceLists: vi.fn(),
}));

const dataApi = await import('../../src/services/data-api.service.js');
const ex = await import('../../src/operations/audience/export.op.js');
const rec = await import('../../src/operations/audience/recurring.op.js');
const { describeFlags } = await import('../../src/core/cli-adapter.js');
const { renderResult } = await import('../../src/core/render.js');

const ctx = { property: '123', globals: {} as never, interactive: false };
const FIXTURES = join(import.meta.dirname, '../fixtures/help-v1');

function fixtureFlags(file: string): string[] {
  const help = readFileSync(join(FIXTURES, file), 'utf-8');
  const start = help.indexOf('\nOptions:\n');
  const end = help.indexOf('\n\n', start + 10);
  return help
    .slice(start + 10, end === -1 ? undefined : end)
    .split('\n')
    .map((l) => l.match(/^ {2}(-\S.*?)(?: {2,}|$)/)?.[1])
    .filter((t): t is string => !!t && t !== '-h, --help');
}

const exportRes = {
  name: 'properties/123/audienceExports/9',
  audience: 'properties/123/audiences/7',
  state: 'ACTIVE',
  rowCount: 42,
  creationQuotaTokensCharged: 5,
  beginCreatingTime: { seconds: '1700000000', nanos: 0 },
};
const recurringRes = {
  name: 'properties/123/recurringAudienceLists/4',
  audience: 'properties/123/audiences/7',
  audienceDisplayName: 'Buyers',
  activeDaysRemaining: 180,
};
const audienceRows = { headers: ['deviceId'], rows: [['abc'], ['def']], rowCount: 2 };

beforeEach(() => {
  for (const fn of Object.values(dataApi)) vi.mocked(fn as () => unknown).mockReset();
});

describe('operation metadata', () => {
  const table = [
    [ex.audienceExportCreate, 'audience.export.create', 'create', true, 'audience_export_create.txt'],
    [ex.audienceExportGet, 'audience.export.get', 'read', false, 'audience_export_get.txt'],
    [ex.audienceExportList, 'audience.export.list', 'read', true, 'audience_export_list.txt'],
    [ex.audienceExportQuery, 'audience.export.query', 'read', false, 'audience_export_query.txt'],
    [
      rec.recurringAudienceCreate,
      'audience.recurring.create',
      'create',
      true,
      'audience_recurring_create.txt',
    ],
    [rec.recurringAudienceGet, 'audience.recurring.get', 'read', false, 'audience_recurring_get.txt'],
    [rec.recurringAudienceList, 'audience.recurring.list', 'read', true, 'audience_recurring_list.txt'],
  ] as const;

  it.each(table)(
    '%#: id, category, needsProperty, summary and 1.x flags',
    (op, id, category, needs, fixture) => {
      expect(op.id).toBe(id);
      expect(op.category).toBe(category);
      expect(!!op.needsProperty).toBe(needs);
      const help = readFileSync(join(FIXTURES, fixture), 'utf-8');
      expect(help.split('\n')[2]).toBe(op.summary);
      const flags = new Set(describeFlags(op).map((f) => f.flag));
      for (const flag of fixtureFlags(fixture)) expect(flags).toContain(flag);
    },
  );

  it('exports the ops arrays in 1.x order', () => {
    expect(ex.audienceExportOps.map((o) => o.id)).toEqual([
      'audience.export.create',
      'audience.export.get',
      'audience.export.list',
      'audience.export.query',
    ]);
    expect(rec.recurringAudienceOps.map((o) => o.id)).toEqual([
      'audience.recurring.create',
      'audience.recurring.get',
      'audience.recurring.list',
    ]);
  });

  it('--watch defaults to false like 1.x', () => {
    const watch = describeFlags(ex.audienceExportCreate).find((f) => f.key === 'watch');
    expect(watch?.defaultValue).toBe(false);
  });
});

describe('audience.export.create', () => {
  it('without --watch returns the operation row like 1.x', async () => {
    const promise = vi.fn();
    vi.mocked(dataApi.createAudienceExport).mockResolvedValue({
      name: 'operations/op1',
      done: false,
      metadata: {},
      promise,
    });
    const out = await ex.audienceExportCreate.run(
      ex.audienceExportCreate.input.parse({ audience: exportRes.audience, dimensions: ['deviceId'] }),
      ctx,
    );
    expect(dataApi.createAudienceExport).toHaveBeenCalledWith('123', exportRes.audience, ['deviceId']);
    expect(promise).not.toHaveBeenCalled();
    expect(out).toEqual({
      headers: ['Operation Name', 'State'],
      rows: [['operations/op1', 'CREATING']],
      rowCount: 1,
      metadata: { done: false },
    });
    expect(ex.audienceExportCreate.output.safeParse(out).success).toBe(true);
  });

  it('with --watch waits for the long-running operation and returns the export', async () => {
    const promise = vi.fn(async () => [exportRes, undefined, undefined] as never);
    vi.mocked(dataApi.createAudienceExport).mockResolvedValue({
      name: 'operations/op1',
      done: false,
      promise,
    });
    const out = await ex.audienceExportCreate.run(
      ex.audienceExportCreate.input.parse({ audience: exportRes.audience, watch: true }),
      ctx,
    );
    expect(dataApi.createAudienceExport).toHaveBeenCalledWith('123', exportRes.audience, undefined);
    expect(promise).toHaveBeenCalledOnce();
    expect(out).toEqual({
      headers: ['Name', 'Audience', 'State', 'Row Count'],
      rows: [[exportRes.name, exportRes.audience, 'ACTIVE', '42']],
      rowCount: 1,
      metadata: { done: true },
    });
    expect(ex.audienceExportCreate.output.safeParse(out).success).toBe(true);
  });

  it('requires --audience', () => {
    expect(ex.audienceExportCreate.input.safeParse({}).success).toBe(false);
  });
});

describe('audience.export.get', () => {
  it('fetches by name and renders the 1.x fields', async () => {
    vi.mocked(dataApi.getAudienceExport).mockResolvedValue(exportRes as never);
    const op = ex.audienceExportGet;
    const out = await op.run(op.input.parse({ name: exportRes.name }), ctx);
    expect(dataApi.getAudienceExport).toHaveBeenCalledWith(exportRes.name);
    expect(op.output.safeParse(out).success).toBe(true);
    const csv = renderResult(op, out, { format: 'csv', pretty: false });
    expect(csv.split('\n')[0]).toBe(
      'Name,Audience,State,Creation Quota Tokens Charged,Row Count,Begin Creating Time',
    );
    expect(csv).toContain('2023-11-14T22:13:20.000Z');
  });
});

describe('audience.export.list', () => {
  it('lists by property with the 1.x columns', async () => {
    vi.mocked(dataApi.listAudienceExports).mockResolvedValue([exportRes] as never);
    const op = ex.audienceExportList;
    const out = await op.run(op.input.parse({}), ctx);
    expect(dataApi.listAudienceExports).toHaveBeenCalledWith('123');
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.map((c) => c.header)).toEqual([
      'Name',
      'Audience',
      'State',
      'Row Count',
      'Begin Creating Time',
    ]);
  });
});

describe('audience.export.query', () => {
  it('passes name/limit/offset and returns the ReportData (dimension headers)', async () => {
    vi.mocked(dataApi.queryAudienceExport).mockResolvedValue(audienceRows);
    const op = ex.audienceExportQuery;
    expect(op.kind).toBe('report');
    const out = await op.run(op.input.parse({ name: exportRes.name, limit: '10', offset: '5' }), ctx);
    expect(dataApi.queryAudienceExport).toHaveBeenCalledWith(exportRes.name, 10, 5);
    expect(out).toEqual(audienceRows);
    expect(op.output.safeParse(out).success).toBe(true);
  });

  it('omits limit/offset when absent and rejects a non-numeric --limit', async () => {
    vi.mocked(dataApi.queryAudienceExport).mockResolvedValue(audienceRows);
    const op = ex.audienceExportQuery;
    await op.run(op.input.parse({ name: exportRes.name }), ctx);
    expect(dataApi.queryAudienceExport).toHaveBeenCalledWith(exportRes.name, undefined, undefined);
    expect(op.input.safeParse({ name: exportRes.name, limit: 'abc' }).success).toBe(false);
  });
});

describe('audience.recurring', () => {
  it('create sends property, audience and dimensions', async () => {
    vi.mocked(dataApi.createRecurringAudienceList).mockResolvedValue(recurringRes);
    const op = rec.recurringAudienceCreate;
    const out = await op.run(
      op.input.parse({ audience: recurringRes.audience, dimensions: ['deviceId'] }),
      ctx,
    );
    expect(dataApi.createRecurringAudienceList).toHaveBeenCalledWith('123', recurringRes.audience, [
      'deviceId',
    ]);
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.map((c) => c.header)).toEqual(['Name', 'Audience', 'Active Days Remaining']);
  });

  it('get fetches by name', async () => {
    vi.mocked(dataApi.getRecurringAudienceList).mockResolvedValue(recurringRes);
    const op = rec.recurringAudienceGet;
    const out = await op.run(op.input.parse({ name: recurringRes.name }), ctx);
    expect(dataApi.getRecurringAudienceList).toHaveBeenCalledWith(recurringRes.name);
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.map((c) => c.header)).toEqual([
      'Name',
      'Audience',
      'Audience Display Name',
      'Active Days Remaining',
    ]);
  });

  it('list lists by property', async () => {
    vi.mocked(dataApi.listRecurringAudienceLists).mockResolvedValue([recurringRes]);
    const op = rec.recurringAudienceList;
    const out = await op.run(op.input.parse({}), ctx);
    expect(dataApi.listRecurringAudienceLists).toHaveBeenCalledWith('123');
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.map((c) => c.header)).toEqual(['Name', 'Audience', 'State']);
  });
});
