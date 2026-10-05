import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatChart } from '../../src/formatters/chart.formatter.js';
import { setColorEnabled } from '../../src/utils/style.js';

describe('formatChart', () => {
  beforeEach(() => setColorEnabled(false));
  afterEach(() => setColorEnabled(true));

  it('renders title and bars', () => {
    const out = formatChart({
      headers: ['country', 'sessions'],
      rows: [
        ['RO', '100'],
        ['MD', '50'],
      ],
      rowCount: 2,
    });
    expect(out).toContain('sessions by country');
    expect(out).toContain('█');
  });

  it('reports empty data', () => {
    expect(formatChart({ headers: ['a', 'b'], rows: [], rowCount: 0 })).toBe('No data to chart.');
  });

  it('requires at least two columns', () => {
    expect(formatChart({ headers: ['a'], rows: [['1']], rowCount: 1 })).toContain(
      'requires at least two columns',
    );
  });
});
