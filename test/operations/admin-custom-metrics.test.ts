import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = {
  listCustomMetrics: vi.fn(),
  getCustomMetric: vi.fn(),
  createCustomMetric: vi.fn(),
  updateCustomMetric: vi.fn(),
  archiveCustomMetric: vi.fn(),
};
vi.mock('../../src/services/admin-api.service.js', () => ({ getAdminClient: vi.fn(async () => client) }));

const { describeFlags } = await import('../../src/core/cli-adapter.js');
const cm = await import('../../src/operations/admin/custom-metrics.op.js');

const ctx = { property: '123', globals: {} as never, interactive: false };
const metric = {
  name: 'properties/123/customMetrics/1',
  parameterName: 'price',
  displayName: 'Price',
  description: '',
  scope: 'EVENT',
  measurementUnit: 'CURRENCY',
};

// Same parsing as flagTokens in test/cli/help-compat.test.ts.
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

beforeEach(() => {
  for (const fn of Object.values(client)) fn.mockReset().mockResolvedValue([metric]);
});

describe('admin custom-metrics ops', () => {
  it('exports ops in 1.x order and accepts every 1.x flag', () => {
    expect(cm.customMetricOps.map((o) => o.id)).toEqual([
      'admin.custom-metrics.list',
      'admin.custom-metrics.get',
      'admin.custom-metrics.create',
      'admin.custom-metrics.update',
      'admin.custom-metrics.archive',
    ]);
    for (const op of cm.customMetricOps) {
      const before = fixtureFlags(`admin_custom-metrics_${op.id.split('.').at(-1)}.txt`);
      expect(describeFlags(op).map((f) => f.flag)).toEqual(expect.arrayContaining(before));
    }
  });

  it('list: property parent, 1.x columns', async () => {
    const op = cm.listCustomMetrics;
    expect(op.category).toBe('read');
    expect(op.needsProperty).toBe(true);
    client.listCustomMetrics.mockResolvedValue([[metric]]);
    const out = await op.run(op.input.parse({}), ctx);
    expect(client.listCustomMetrics).toHaveBeenCalledWith({ parent: 'properties/123' });
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.map((c) => c.header)).toEqual([
      'Name',
      'Parameter Name',
      'Display Name',
      'Description',
      'Scope',
      'Measurement Unit',
    ]);
  });

  it('get: by name', async () => {
    const op = cm.getCustomMetric;
    expect(op.category).toBe('read');
    expect(op.needsProperty).toBeFalsy();
    const out = await op.run(op.input.parse({ name: metric.name }), ctx);
    expect(client.getCustomMetric).toHaveBeenCalledWith({ name: metric.name });
    expect(op.output.safeParse(out).success).toBe(true);
  });

  it('create: same request as 1.x', async () => {
    const op = cm.createCustomMetric;
    expect(op.category).toBe('create');
    expect(op.needsProperty).toBe(true);
    const input = op.input.parse({
      parameterName: 'price',
      displayName: 'Price',
      scope: 'EVENT',
      measurementUnit: 'CURRENCY',
    });
    const out = await op.run(input, ctx);
    expect(client.createCustomMetric).toHaveBeenCalledWith({
      parent: 'properties/123',
      customMetric: {
        parameterName: 'price',
        displayName: 'Price',
        description: '',
        scope: 'EVENT',
        measurementUnit: 'CURRENCY',
      },
    });
    expect(op.output.safeParse(out).success).toBe(true);
  });

  it('create: rejects an unknown scope or unit and a missing unit', () => {
    const op = cm.createCustomMetric;
    const base = { parameterName: 'p', displayName: 'P', scope: 'EVENT', measurementUnit: 'STANDARD' };
    expect(op.input.safeParse(base).success).toBe(true);
    expect(op.input.safeParse({ ...base, scope: 'USER' }).success).toBe(false);
    expect(op.input.safeParse({ ...base, measurementUnit: 'LITERS' }).success).toBe(false);
    expect(op.input.safeParse({ ...base, measurementUnit: undefined }).success).toBe(false);
  });

  it('update: mask like 1.x (empty display name skipped, empty description sent)', async () => {
    const op = cm.updateCustomMetric;
    expect(op.category).toBe('update');
    expect(op.needsProperty).toBeFalsy();
    const out = await op.run(
      op.input.parse({ name: metric.name, displayName: '', description: '', measurementUnit: 'SECONDS' }),
      ctx,
    );
    expect(client.updateCustomMetric).toHaveBeenCalledWith({
      customMetric: { name: metric.name, description: '', measurementUnit: 'SECONDS' },
      updateMask: { paths: ['description', 'measurement_unit'] },
    });
    expect(op.output.safeParse(out).success).toBe(true);

    await op.run(op.input.parse({ name: metric.name, displayName: 'New' }), ctx);
    expect(client.updateCustomMetric).toHaveBeenLastCalledWith({
      customMetric: { name: metric.name, displayName: 'New' },
      updateMask: { paths: ['display_name'] },
    });
  });

  it('archive: delete category, status row', async () => {
    const op = cm.archiveCustomMetric;
    expect(op.category).toBe('delete');
    const out = await op.run(op.input.parse({ name: metric.name }), ctx);
    expect(client.archiveCustomMetric).toHaveBeenCalledWith({ name: metric.name });
    expect(out).toEqual({ name: metric.name, archived: true });
    expect(op.output.safeParse(out).success).toBe(true);
    expect(op.columns?.map((c) => c.header)).toEqual(['Status', 'Custom Metric']);
  });
});
