import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { OPERATIONS } from '../../src/operations/index.js';
import { nameList } from '../../src/operations/shared.js';

describe('nameList (metric/dimension lists)', () => {
  it('accepts space-separated values and comma-joined values alike', () => {
    expect(nameList().parse(['sessions', 'activeUsers'])).toEqual(['sessions', 'activeUsers']);
    expect(nameList().parse(['sessions,activeUsers', ' date , country'])).toEqual([
      'sessions',
      'activeUsers',
      'date',
      'country',
    ]);
  });

  it('still requires at least one name when asked to', () => {
    expect(nameList({ min: 1 }).safeParse([]).success).toBe(false);
  });

  it('keeps a string-array input JSON Schema (schema/MCP)', () => {
    expect(z.toJSONSchema(nameList(), { io: 'input' })).toMatchObject({
      type: 'array',
      items: { type: 'string' },
    });
  });

  it('is used by every report-style operation for metrics and dimensions', () => {
    for (const id of [
      'report.run',
      'report.realtime',
      'report.pivot',
      'report.cohort',
      'report.tasks.create',
    ]) {
      const op = OPERATIONS.find((o) => o.id === id);
      const parsed = op?.input.parse({
        metrics: ['sessions,activeUsers'],
        dimensions: ['date,country'],
        pivots: '[{"fieldNames":["date"],"limit":5}]',
        cohorts:
          '[{"dimension":"firstSessionDate","dateRange":{"startDate":"2026-01-01","endDate":"2026-01-07"}}]',
      }) as { metrics: string[]; dimensions?: string[] };
      expect(parsed.metrics, id).toEqual(['sessions', 'activeUsers']);
      expect(parsed.dimensions, id).toEqual(['date', 'country']);
    }
  });
});
