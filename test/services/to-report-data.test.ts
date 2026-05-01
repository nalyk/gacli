import { describe, expect, it } from 'vitest';
import { toReportData } from '../../src/services/data-api.service.js';

describe('toReportData', () => {
  it('maps headers + rows from a typical Data API response', () => {
    expect(
      toReportData({
        dimensionHeaders: [{ name: 'country' }, { name: 'date' }],
        metricHeaders: [{ name: 'sessions' }],
        rows: [
          {
            dimensionValues: [{ value: 'US' }, { value: '20260501' }],
            metricValues: [{ value: '120' }],
          },
          {
            dimensionValues: [{ value: 'GB' }, { value: '20260501' }],
            metricValues: [{ value: '34' }],
          },
        ],
        rowCount: 2,
      }),
    ).toEqual({
      headers: ['country', 'date', 'sessions'],
      rows: [
        ['US', '20260501', '120'],
        ['GB', '20260501', '34'],
      ],
      rowCount: 2,
      metadata: undefined,
    });
  });

  it('treats null/undefined header lists as empty', () => {
    const r = toReportData({});
    expect(r).toEqual({ headers: [], rows: [], rowCount: 0, metadata: undefined });
  });

  it('coerces null cell values to empty string', () => {
    const r = toReportData({
      dimensionHeaders: [{ name: 'a' }],
      metricHeaders: [{ name: 'b' }],
      rows: [{ dimensionValues: [{ value: null }], metricValues: [{ value: undefined }] }],
      rowCount: 1,
    });
    expect(r.rows[0]).toEqual(['', '']);
  });

  it('coerces null header names to empty string', () => {
    const r = toReportData({
      dimensionHeaders: [{ name: null }],
      metricHeaders: [{ name: undefined }],
      rows: [],
    });
    expect(r.headers).toEqual(['', '']);
  });

  it('falls back to rows.length when rowCount is missing', () => {
    const r = toReportData({
      dimensionHeaders: [{ name: 'x' }],
      metricHeaders: [],
      rows: [
        { dimensionValues: [{ value: '1' }], metricValues: [] },
        { dimensionValues: [{ value: '2' }], metricValues: [] },
        { dimensionValues: [{ value: '3' }], metricValues: [] },
      ],
    });
    expect(r.rowCount).toBe(3);
  });

  it('preserves the explicit rowCount even when greater than rows.length (sampled responses)', () => {
    const r = toReportData({
      dimensionHeaders: [{ name: 'x' }],
      metricHeaders: [],
      rows: [{ dimensionValues: [{ value: '1' }], metricValues: [] }],
      rowCount: 9999,
    });
    expect(r.rowCount).toBe(9999);
  });

  it('shallow-copies metadata when present', () => {
    const meta = { samplingMetadata: { samplesReadCount: '100' } };
    const r = toReportData({ metadata: meta });
    expect(r.metadata).toEqual(meta);
    expect(r.metadata).not.toBe(meta);
  });

  it('strips non-object metadata', () => {
    const r = toReportData({ metadata: 'string-not-an-object' as unknown });
    expect(r.metadata).toBeUndefined();
  });

  it('handles zero rows + zero headers without crashing', () => {
    expect(toReportData({ rows: [], rowCount: 0 })).toEqual({
      headers: [],
      rows: [],
      rowCount: 0,
      metadata: undefined,
    });
  });

  it('preserves dimension+metric ordering in the row tuple', () => {
    // GA4 wire format: each row has separate dimensionValues and metricValues arrays.
    // toReportData must concatenate dim then metric, preserving the header order.
    const r = toReportData({
      dimensionHeaders: [{ name: 'd1' }, { name: 'd2' }],
      metricHeaders: [{ name: 'm1' }, { name: 'm2' }],
      rows: [
        {
          dimensionValues: [{ value: 'A' }, { value: 'B' }],
          metricValues: [{ value: '1' }, { value: '2' }],
        },
      ],
      rowCount: 1,
    });
    expect(r.headers).toEqual(['d1', 'd2', 'm1', 'm2']);
    expect(r.rows[0]).toEqual(['A', 'B', '1', '2']);
  });
});
