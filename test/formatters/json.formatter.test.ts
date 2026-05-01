import { describe, expect, it } from 'vitest';
import { formatJson } from '../../src/formatters/json.formatter.js';
import type { ReportData } from '../../src/types/common.js';

describe('formatJson', () => {
  const mockData: ReportData = {
    headers: ['metric', 'value', 'dimension'],
    rows: [
      ['sessions', '1000', 'web'],
      ['users', '850', 'web'],
      ['conversions', '120', 'web'],
    ],
    rowCount: 3,
  };

  it('emits {rowCount, data:[{...}]} shape', () => {
    const parsed = JSON.parse(formatJson(mockData));
    expect(parsed).toEqual({
      rowCount: 3,
      data: [
        { metric: 'sessions', value: '1000', dimension: 'web' },
        { metric: 'users', value: '850', dimension: 'web' },
        { metric: 'conversions', value: '120', dimension: 'web' },
      ],
    });
  });

  it('round-trips through JSON.parse without throwing', () => {
    expect(() => JSON.parse(formatJson(mockData))).not.toThrow();
  });

  it('handles empty rows', () => {
    const parsed = JSON.parse(formatJson({ headers: ['x'], rows: [], rowCount: 0 }));
    expect(parsed).toEqual({ rowCount: 0, data: [] });
  });

  it('handles empty headers and empty rows', () => {
    const parsed = JSON.parse(formatJson({ headers: [], rows: [], rowCount: 0 }));
    expect(parsed).toEqual({ rowCount: 0, data: [] });
  });

  it('preserves special characters', () => {
    const parsed = JSON.parse(
      formatJson({
        headers: ['metric', 'description'],
        rows: [
          ['sessions', 'Sessions with @#$%^&*'],
          ['users', 'Users with "quotes"'],
        ],
        rowCount: 2,
      }),
    );
    expect(parsed.data[0].description).toBe('Sessions with @#$%^&*');
    expect(parsed.data[1].description).toBe('Users with "quotes"');
  });

  it('preserves unicode', () => {
    const parsed = JSON.parse(
      formatJson({
        headers: ['metric', 'country'],
        rows: [
          ['sessions', '🇺🇸'],
          ['users', '🇬🇧'],
        ],
        rowCount: 2,
      }),
    );
    expect(parsed.data[0].country).toBe('🇺🇸');
    expect(parsed.data[1].country).toBe('🇬🇧');
  });

  it('preserves numeric values as strings (GA4 returns strings)', () => {
    const parsed = JSON.parse(
      formatJson({
        headers: ['id', 'value', 'score'],
        rows: [
          ['1', '100', '95.5'],
          ['2', '200', '88'],
        ],
        rowCount: 2,
      }),
    );
    expect(parsed.data[0]).toEqual({ id: '1', value: '100', score: '95.5' });
    expect(parsed.data[1]).toEqual({ id: '2', value: '200', score: '88' });
  });

  it('coerces missing cells to empty string', () => {
    const parsed = JSON.parse(
      formatJson({
        headers: ['a', 'b', 'c'],
        rows: [['x', 'y']],
        rowCount: 1,
      }),
    );
    expect(parsed.data[0]).toEqual({ a: 'x', b: 'y', c: '' });
  });

  it('emits metadata when present and non-empty', () => {
    const parsed = JSON.parse(
      formatJson({
        headers: ['x'],
        rows: [['1']],
        rowCount: 1,
        metadata: { samplingMetadata: { samplesReadCount: '100' } },
      }),
    );
    expect(parsed.metadata).toEqual({ samplingMetadata: { samplesReadCount: '100' } });
  });

  it('omits metadata when empty', () => {
    const parsed = JSON.parse(formatJson({ headers: ['x'], rows: [['1']], rowCount: 1, metadata: {} }));
    expect(parsed).not.toHaveProperty('metadata');
  });

  it('handles large datasets', () => {
    const rows: string[][] = Array.from({ length: 1000 }, (_, i) => [`v${i}`, `d${i}`]);
    const parsed = JSON.parse(formatJson({ headers: ['metric', 'dimension'], rows, rowCount: 1000 }));
    expect(parsed.data).toHaveLength(1000);
    expect(parsed.rowCount).toBe(1000);
    expect(parsed.data[999]).toEqual({ metric: 'v999', dimension: 'd999' });
  });
});
