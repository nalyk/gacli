import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/data-api.service.js', () => ({
  checkCompatibility: vi.fn(),
}));

const dataApi = await import('../../src/services/data-api.service.js');
const { describeFlags } = await import('../../src/core/cli-adapter.js');
const { metadataCheckCompatibility } = await import(
  '../../src/operations/metadata/check-compatibility.op.js'
);
const { metadataExtraOps } = await import('../../src/operations/metadata/index.js');

const ctx = { property: '123', globals: {} as never, interactive: false };

beforeEach(() => {
  vi.mocked(dataApi.checkCompatibility)
    .mockReset()
    .mockResolvedValue({
      dimensionCompatibilities: [
        { dimensionMetadata: { apiName: 'country' }, compatibility: 'INCOMPATIBLE' },
        { dimensionMetadata: { apiName: 'city' }, compatibility: 'COMPATIBLE' },
      ],
      metricCompatibilities: [
        { metricMetadata: { apiName: 'sessions' }, compatibility: 'COMPATIBLE' },
        { metricMetadata: {}, compatibility: 'INCOMPATIBLE' },
      ],
    });
});

describe('metadata.check-compatibility', () => {
  it('is registered and shaped like 1.x', () => {
    expect(metadataExtraOps.map((o) => o.id)).toEqual(['metadata.check-compatibility']);
    expect(metadataCheckCompatibility.category).toBe('read');
    expect(metadataCheckCompatibility.needsProperty).toBe(true);
    expect(metadataCheckCompatibility.kind).toBe('resource');
    expect(metadataCheckCompatibility.columns?.map((c) => c.header)).toEqual([
      'Name',
      'Type',
      'Compatibility',
    ]);
  });

  it('accepts every 1.x flag', () => {
    const help = readFileSync(
      resolve(process.cwd(), 'test/fixtures/help-v1/metadata_check-compatibility.txt'),
      'utf-8',
    );
    const flags = describeFlags(metadataCheckCompatibility).map((s) => s.flag);
    for (const line of help.split('\n')) {
      const flag = line.match(/^ {2}(-\S.*?)(?: {2,}|$)/)?.[1];
      if (flag && flag !== '-h, --help') expect(flags).toContain(flag);
    }
  });

  it('calls checkCompatibility and orders rows like 1.x', async () => {
    const out = await metadataCheckCompatibility.run(
      metadataCheckCompatibility.input.parse({ metrics: ['sessions'], dimensions: ['country', 'city'] }),
      ctx,
    );
    expect(dataApi.checkCompatibility).toHaveBeenCalledWith('123', ['sessions'], ['country', 'city']);
    expect(out).toEqual([
      { name: 'city', type: 'Dimension', compatibility: 'Compatible' },
      { name: 'country', type: 'Dimension', compatibility: 'Incompatible' },
      { name: 'sessions', type: 'Metric', compatibility: 'Compatible' },
      { name: '', type: 'Metric', compatibility: 'Incompatible' },
    ]);
    expect(metadataCheckCompatibility.output.safeParse(out).success).toBe(true);
  });

  it('requires both metrics and dimensions', () => {
    expect(metadataCheckCompatibility.input.safeParse({ metrics: ['sessions'] }).success).toBe(false);
  });
});
