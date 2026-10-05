import { Command } from 'commander';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = {
  listAccountSummaries: vi.fn(),
  listReportingDataAnnotations: vi.fn(),
  createReportingDataAnnotation: vi.fn(),
  updateReportingDataAnnotation: vi.fn(),
  deleteReportingDataAnnotation: vi.fn(),
  searchChangeHistoryEvents: vi.fn(),
  runAccessReport: vi.fn(),
  listMeasurementProtocolSecrets: vi.fn(),
  createMeasurementProtocolSecret: vi.fn(),
  deleteMeasurementProtocolSecret: vi.fn(),
  getDataRetentionSettings: vi.fn(),
  updateDataRetentionSettings: vi.fn(),
};
vi.mock('../../src/services/admin-api.service.js', () => ({ getAdminClient: vi.fn(async () => client) }));

const { mountOperations } = await import('../../src/core/cli-adapter.js');
const summaries = await import('../../src/operations/admin/account-summaries.op.js');
const annotations = await import('../../src/operations/admin/annotations.op.js');
const changeHistory = await import('../../src/operations/admin/change-history.op.js');
const accessReport = await import('../../src/operations/admin/access-report.op.js');
const secrets = await import('../../src/operations/admin/measurement-secrets.op.js');
const retention = await import('../../src/operations/admin/data-retention.op.js');

const ctx = { property: '123', globals: { property: '123' } as never, interactive: false };
const noPropCtx = { property: '', globals: { property: '' } as never, interactive: false };

beforeEach(() => {
  for (const fn of Object.values(client)) fn.mockReset();
});

const ALL = [
  ...summaries.accountSummaryOps,
  ...annotations.annotationOps,
  ...changeHistory.changeHistoryOps,
  ...accessReport.accessReportOps,
  ...secrets.measurementSecretOps,
  ...retention.dataRetentionOps,
];

describe('phase 4 admin ops: catalogue', () => {
  it('exports the expected ids in order', () => {
    expect(ALL.map((o) => o.id)).toEqual([
      'admin.accounts.summaries',
      'admin.annotations.list',
      'admin.annotations.create',
      'admin.annotations.update',
      'admin.annotations.delete',
      'admin.change-history.search',
      'admin.access-report.run',
      'admin.measurement-secrets.list',
      'admin.measurement-secrets.create',
      'admin.measurement-secrets.delete',
      'admin.data-retention.get',
      'admin.data-retention.update',
    ]);
  });

  it('mounts on commander with consistent flag keys', () => {
    const program = new Command();
    expect(() => mountOperations(program, ALL)).not.toThrow();
    const admin = program.commands.find((c) => c.name() === 'admin');
    expect(admin?.commands.map((c) => c.name())).toEqual([
      'accounts',
      'annotations',
      'change-history',
      'access-report',
      'measurement-secrets',
      'data-retention',
    ]);
  });

  it('every input field is described', () => {
    for (const op of ALL) {
      for (const [key, field] of Object.entries(op.input.shape)) {
        expect(field.description, `${op.id}.${key}`).toBeTruthy();
      }
    }
  });
});

describe('admin accounts summaries', () => {
  const summary = {
    name: 'accountSummaries/1',
    account: 'accounts/1',
    displayName: 'Acme',
    propertySummaries: [
      {
        property: 'properties/10',
        displayName: 'Web',
        propertyType: 'PROPERTY_TYPE_ORDINARY',
        parent: 'accounts/1',
      },
      {
        property: 'properties/11',
        displayName: 'App',
        propertyType: 'PROPERTY_TYPE_ORDINARY',
        parent: 'accounts/1',
      },
    ],
  };

  it('lists summaries without a property', async () => {
    const op = summaries.listAccountSummaries;
    expect(op.category).toBe('read');
    expect(op.needsProperty).toBe(false);
    client.listAccountSummaries.mockResolvedValue([[summary]]);
    const out = await op.run(op.input.parse({}), noPropCtx);
    expect(client.listAccountSummaries).toHaveBeenCalledWith({});
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.map((c) => c.header)).toEqual(['Account', 'Display Name', 'Properties']);
    const props = op.columns?.find((c) => c.header === 'Properties');
    expect(props?.format?.(summary.propertySummaries)).toBe('Web, App');
    expect(props?.format?.(undefined)).toBe('');
  });
});

describe('admin annotations', () => {
  const annotation = {
    name: 'properties/123/reportingDataAnnotations/7',
    title: 'Launch',
    description: 'v2 launch',
    color: 'BLUE',
    annotationDate: { year: 2026, month: 3, day: 9 },
    systemGenerated: false,
  };

  it('list: property parent', async () => {
    const op = annotations.listAnnotations;
    expect(op.category).toBe('read');
    expect(op.needsProperty).toBe(true);
    client.listReportingDataAnnotations.mockResolvedValue([[annotation]]);
    const out = await op.run(op.input.parse({}), ctx);
    expect(client.listReportingDataAnnotations).toHaveBeenCalledWith({ parent: 'properties/123' });
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.[0].header).toBe('Name');
    const date = op.columns?.find((c) => c.header === 'Date');
    expect(date?.format?.(annotation.annotationDate)).toBe('2026-03-09');
  });

  it('create: single date', async () => {
    const op = annotations.createAnnotation;
    expect(op.category).toBe('create');
    expect(op.needsProperty).toBe(true);
    client.createReportingDataAnnotation.mockResolvedValue([annotation]);
    const out = await op.run(
      op.input.parse({
        title: 'Launch',
        description: 'v2 launch',
        color: 'BLUE',
        annotationDate: '2026-03-09',
      }),
      ctx,
    );
    expect(client.createReportingDataAnnotation).toHaveBeenCalledWith({
      parent: 'properties/123',
      reportingDataAnnotation: {
        title: 'Launch',
        description: 'v2 launch',
        color: 'BLUE',
        annotationDate: { year: 2026, month: 3, day: 9 },
      },
    });
    expect(op.output.safeParse(out).success).toBe(true);
  });

  it('create: date range', async () => {
    const op = annotations.createAnnotation;
    client.createReportingDataAnnotation.mockResolvedValue([annotation]);
    await op.run(
      op.input.parse({ title: 'Sale', color: 'RED', startDate: '2026-11-27', endDate: '2026-12-01' }),
      ctx,
    );
    expect(client.createReportingDataAnnotation).toHaveBeenCalledWith({
      parent: 'properties/123',
      reportingDataAnnotation: {
        title: 'Sale',
        color: 'RED',
        annotationDateRange: {
          startDate: { year: 2026, month: 11, day: 27 },
          endDate: { year: 2026, month: 12, day: 1 },
        },
      },
    });
  });

  it('create: rejects missing/both date forms, bad dates and bad colors', () => {
    const op = annotations.createAnnotation;
    expect(op.input.safeParse({ title: 'x', color: 'BLUE' }).success).toBe(false);
    expect(
      op.input.safeParse({
        title: 'x',
        color: 'BLUE',
        annotationDate: '2026-01-01',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
      }).success,
    ).toBe(false);
    expect(op.input.safeParse({ title: 'x', color: 'BLUE', startDate: '2026-01-01' }).success).toBe(false);
    expect(op.input.safeParse({ title: 'x', color: 'BLUE', annotationDate: '2026-02-30' }).success).toBe(
      false,
    );
    expect(op.input.safeParse({ title: 'x', color: 'BLUE', annotationDate: '01/02/2026' }).success).toBe(
      false,
    );
    expect(op.input.safeParse({ title: 'x', color: 'PINK', annotationDate: '2026-01-01' }).success).toBe(
      false,
    );
  });

  it('update: mask only for given fields', async () => {
    const op = annotations.updateAnnotation;
    expect(op.category).toBe('update');
    expect(op.needsProperty).toBeFalsy();
    client.updateReportingDataAnnotation.mockResolvedValue([annotation]);
    const out = await op.run(
      op.input.parse({ name: annotation.name, title: 'New', startDate: '2026-01-01', endDate: '2026-01-31' }),
      ctx,
    );
    expect(client.updateReportingDataAnnotation).toHaveBeenCalledWith({
      reportingDataAnnotation: {
        name: annotation.name,
        title: 'New',
        annotationDateRange: {
          startDate: { year: 2026, month: 1, day: 1 },
          endDate: { year: 2026, month: 1, day: 31 },
        },
      },
      updateMask: { paths: ['title', 'annotation_date_range'] },
    });
    expect(op.output.safeParse(out).success).toBe(true);

    await op.run(
      op.input.parse({ name: annotation.name, color: 'GREEN', annotationDate: '2026-05-01' }),
      ctx,
    );
    expect(client.updateReportingDataAnnotation).toHaveBeenLastCalledWith({
      reportingDataAnnotation: {
        name: annotation.name,
        color: 'GREEN',
        annotationDate: { year: 2026, month: 5, day: 1 },
      },
      updateMask: { paths: ['color', 'annotation_date'] },
    });
  });

  it('update: rejects no changes and both date forms', () => {
    const op = annotations.updateAnnotation;
    expect(op.input.safeParse({ name: annotation.name }).success).toBe(false);
    expect(
      op.input.safeParse({
        name: annotation.name,
        annotationDate: '2026-01-01',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
      }).success,
    ).toBe(false);
  });

  it('delete: status row', async () => {
    const op = annotations.deleteAnnotation;
    expect(op.category).toBe('delete');
    client.deleteReportingDataAnnotation.mockResolvedValue([{}]);
    const out = await op.run(op.input.parse({ name: annotation.name }), ctx);
    expect(client.deleteReportingDataAnnotation).toHaveBeenCalledWith({ name: annotation.name });
    expect(out).toEqual({ name: annotation.name, deleted: true });
    expect(op.output.safeParse(out).success).toBe(true);
  });
});

describe('admin change-history search', () => {
  const event = {
    id: 'e1',
    changeTime: { seconds: '1767225600', nanos: 0 },
    actorType: 'USER',
    userActorEmail: 'a@b.c',
    changesFiltered: false,
    changes: [
      { resource: 'properties/123/customDimensions/1', action: 'CREATED' },
      { resource: 'properties/123/customDimensions/2', action: 'UPDATED' },
      { resource: 'properties/123/customDimensions/2', action: 'UPDATED' },
    ],
  };

  it('normalizes account/property, converts timestamps, caps with --limit', async () => {
    const op = changeHistory.searchChangeHistory;
    expect(op.category).toBe('read');
    expect(op.needsProperty).toBe(false);
    client.searchChangeHistoryEvents.mockResolvedValue([[event]]);
    const out = await op.run(
      op.input.parse({
        account: '42',
        property: 'properties/123',
        resourceType: ['CUSTOM_DIMENSION', 'PROPERTY'],
        action: ['CREATED'],
        earliest: '2026-01-01T00:00:00Z',
        latest: '2026-01-02T00:00:00.250Z',
        limit: '50',
      }),
      noPropCtx,
    );
    expect(client.searchChangeHistoryEvents).toHaveBeenCalledWith(
      {
        account: 'accounts/42',
        property: 'properties/123',
        resourceType: ['CUSTOM_DIMENSION', 'PROPERTY'],
        action: ['CREATED'],
        earliestChangeTime: { seconds: 1767225600, nanos: 0 },
        latestChangeTime: { seconds: 1767312000, nanos: 250_000_000 },
        pageSize: 50,
      },
      { autoPaginate: false },
    );
    expect(op.output.safeParse(out).success).toBe(true);
    const col = (h: string) => op.columns?.find((c) => c.header === h);
    expect(op.columns?.map((c) => c.header)).toEqual([
      'Change Time',
      'Actor',
      'Actor Type',
      'Action(s)',
      'Resource(s)',
      'Changes',
    ]);
    expect(col('Change Time')?.format?.(event.changeTime)).toBe('2026-01-01T00:00:00.000Z');
    expect(col('Action(s)')?.format?.(event.changes)).toBe('CREATED, UPDATED');
    expect(col('Resource(s)')?.format?.(event.changes)).toBe(
      'properties/123/customDimensions/1, properties/123/customDimensions/2',
    );
    expect(col('Changes')?.format?.(event.changes)).toBe('3');
  });

  it('account-wide search: no property, all pages, falls back to the global property', async () => {
    const op = changeHistory.searchChangeHistory;
    client.searchChangeHistoryEvents.mockResolvedValue([[event]]);
    await op.run(op.input.parse({ account: 'accounts/42' }), noPropCtx);
    expect(client.searchChangeHistoryEvents).toHaveBeenLastCalledWith({ account: 'accounts/42' }, undefined);

    // On the CLI the global -p/--property swallows --property, so the global value is the filter.
    await op.run(op.input.parse({ account: '42' }), ctx);
    expect(client.searchChangeHistoryEvents).toHaveBeenLastCalledWith(
      { account: 'accounts/42', property: 'properties/123' },
      undefined,
    );
  });

  it('rejects bad account, enums and datetimes', () => {
    const op = changeHistory.searchChangeHistory;
    expect(op.input.safeParse({}).success).toBe(false);
    expect(op.input.safeParse({ account: 'acme' }).success).toBe(false);
    expect(op.input.safeParse({ account: '1', resourceType: ['NOPE'] }).success).toBe(false);
    expect(op.input.safeParse({ account: '1', action: ['ARCHIVED'] }).success).toBe(false);
    expect(op.input.safeParse({ account: '1', earliest: 'yesterday' }).success).toBe(false);
    expect(op.input.safeParse({ account: '1', limit: '0' }).success).toBe(false);
  });
});

describe('admin access-report run', () => {
  const response = {
    dimensionHeaders: [{ dimensionName: 'userEmail' }],
    metricHeaders: [{ metricName: 'accessCount' }],
    rows: [{ dimensionValues: [{ value: 'a@b.c' }], metricValues: [{ value: '4' }] }],
    rowCount: 1,
  };

  it('defaults the entity to the global property', async () => {
    const op = accessReport.runAccessReport;
    expect(op.category).toBe('read');
    expect(op.kind).toBe('report');
    expect(op.needsProperty).toBe(false);
    client.runAccessReport.mockResolvedValue([response]);
    const out = await op.run(op.input.parse({ dimensions: ['userEmail'], metrics: ['accessCount'] }), ctx);
    expect(client.runAccessReport).toHaveBeenCalledWith({
      entity: 'properties/123',
      dimensions: [{ dimensionName: 'userEmail' }],
      metrics: [{ metricName: 'accessCount' }],
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    });
    expect(out).toEqual({ headers: ['userEmail', 'accessCount'], rows: [['a@b.c', '4']], rowCount: 1 });
    expect(op.output.safeParse(out).success).toBe(true);
  });

  it('explicit account entity, dates and limit', async () => {
    const op = accessReport.runAccessReport;
    client.runAccessReport.mockResolvedValue([{ rows: null }]);
    const out = await op.run(
      op.input.parse({
        entity: 'accounts/9',
        dimensions: ['userEmail'],
        metrics: ['accessCount'],
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        limit: '10',
      }),
      noPropCtx,
    );
    expect(client.runAccessReport).toHaveBeenCalledWith({
      entity: 'accounts/9',
      dimensions: [{ dimensionName: 'userEmail' }],
      metrics: [{ metricName: 'accessCount' }],
      dateRanges: [{ startDate: '2026-01-01', endDate: '2026-01-31' }],
      limit: 10,
    });
    expect(out).toEqual({ headers: [], rows: [], rowCount: 0 });
  });

  it('usage errors: no entity and no property, bad entity', async () => {
    const op = accessReport.runAccessReport;
    await expect(
      op.run(op.input.parse({ dimensions: ['userEmail'], metrics: ['accessCount'] }), noPropCtx),
    ).rejects.toMatchObject({ kind: 'usage' });
    expect(client.runAccessReport).not.toHaveBeenCalled();
    expect(op.input.safeParse({ entity: 'acme', dimensions: ['a'], metrics: ['b'] }).success).toBe(false);
    expect(op.input.safeParse({ dimensions: ['a'] }).success).toBe(false);
  });
});

describe('admin measurement-secrets', () => {
  const stream = 'properties/123/dataStreams/456';
  const secret = {
    name: `${stream}/measurementProtocolSecrets/s1`,
    displayName: 'Server',
    secretValue: 'abc',
  };

  it('list: by stream', async () => {
    const op = secrets.listMeasurementSecrets;
    expect(op.category).toBe('read');
    expect(op.needsProperty).toBe(false);
    client.listMeasurementProtocolSecrets.mockResolvedValue([[secret]]);
    const out = await op.run(op.input.parse({ stream }), noPropCtx);
    expect(client.listMeasurementProtocolSecrets).toHaveBeenCalledWith({ parent: stream });
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.map((c) => c.header)).toEqual(['Name', 'Display Name', 'Secret Value']);
  });

  it('create: display name under stream', async () => {
    const op = secrets.createMeasurementSecret;
    expect(op.category).toBe('create');
    client.createMeasurementProtocolSecret.mockResolvedValue([secret]);
    const out = await op.run(op.input.parse({ stream, displayName: 'Server' }), noPropCtx);
    expect(client.createMeasurementProtocolSecret).toHaveBeenCalledWith({
      parent: stream,
      measurementProtocolSecret: { displayName: 'Server' },
    });
    expect(op.output.safeParse(out).success).toBe(true);
  });

  it('rejects a malformed stream name or missing display name', () => {
    expect(secrets.listMeasurementSecrets.input.safeParse({ stream: '456' }).success).toBe(false);
    expect(secrets.createMeasurementSecret.input.safeParse({ stream }).success).toBe(false);
  });

  it('delete: status row', async () => {
    const op = secrets.deleteMeasurementSecret;
    expect(op.category).toBe('delete');
    client.deleteMeasurementProtocolSecret.mockResolvedValue([{}]);
    const out = await op.run(op.input.parse({ name: secret.name }), noPropCtx);
    expect(client.deleteMeasurementProtocolSecret).toHaveBeenCalledWith({ name: secret.name });
    expect(out).toEqual({ name: secret.name, deleted: true });
  });
});

describe('admin data-retention', () => {
  const settings = {
    name: 'properties/123/dataRetentionSettings',
    eventDataRetention: 'FOURTEEN_MONTHS',
    userDataRetention: 'FOURTEEN_MONTHS',
    resetUserDataOnNewActivity: true,
  };

  it('get: property settings', async () => {
    const op = retention.getDataRetention;
    expect(op.category).toBe('read');
    expect(op.needsProperty).toBe(true);
    client.getDataRetentionSettings.mockResolvedValue([settings]);
    const out = await op.run(op.input.parse({}), ctx);
    expect(client.getDataRetentionSettings).toHaveBeenCalledWith({
      name: 'properties/123/dataRetentionSettings',
    });
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.map((c) => c.header)).toEqual([
      'Name',
      'Event Data Retention',
      'User Data Retention',
      'Reset On New Activity',
    ]);
  });

  it('update: mask only for given fields', async () => {
    const op = retention.updateDataRetention;
    expect(op.category).toBe('update');
    expect(op.needsProperty).toBe(true);
    client.updateDataRetentionSettings.mockResolvedValue([settings]);
    const out = await op.run(
      op.input.parse({ eventDataRetention: 'FIFTY_MONTHS', resetUserDataOnNewActivity: 'false' }),
      ctx,
    );
    expect(client.updateDataRetentionSettings).toHaveBeenCalledWith({
      dataRetentionSettings: {
        name: 'properties/123/dataRetentionSettings',
        eventDataRetention: 'FIFTY_MONTHS',
        resetUserDataOnNewActivity: false,
      },
      updateMask: { paths: ['event_data_retention', 'reset_user_data_on_new_activity'] },
    });
    expect(op.output.safeParse(out).success).toBe(true);
  });

  it('update: rejects no fields and bad enums', () => {
    const op = retention.updateDataRetention;
    expect(op.input.safeParse({}).success).toBe(false);
    expect(op.input.safeParse({ userDataRetention: 'FOREVER' }).success).toBe(false);
    expect(op.input.safeParse({ resetUserDataOnNewActivity: 'yes' }).success).toBe(false);
  });
});
