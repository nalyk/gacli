import { describe, expect, it } from 'vitest';
import { formatTable } from '../../src/formatters/table.formatter.js';
import type { ReportData } from '../../src/types/common.js';

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape codes literally are control chars
const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

describe('formatTable', () => {
  const mockData: ReportData = {
    headers: ['Metric', 'Value', 'Dimension'],
    rows: [
      ['sessions', '1000', 'web'],
      ['users', '850', 'web'],
      ['conversions', '120', 'web'],
    ],
    rowCount: 3,
  };

  it('returns "No data returned." for empty rows', () => {
    expect(stripAnsi(formatTable({ headers: ['x'], rows: [], rowCount: 0 }))).toContain('No data returned.');
  });

  it('returns "No data returned." for empty headers and rows', () => {
    expect(stripAnsi(formatTable({ headers: [], rows: [], rowCount: 0 }))).toContain('No data returned.');
  });

  it('renders headers and all row cells', () => {
    const out = stripAnsi(formatTable(mockData));
    expect(out).toContain('Metric');
    expect(out).toContain('Value');
    expect(out).toContain('Dimension');
    expect(out).toContain('sessions');
    expect(out).toContain('1000');
    expect(out).toContain('conversions');
  });

  it('appends row count footer', () => {
    expect(stripAnsi(formatTable(mockData))).toContain('3 row(s)');
  });

  it('uses rowCount field, not rows.length, for footer', () => {
    const out = stripAnsi(formatTable({ headers: ['x'], rows: [['1']], rowCount: 9999 }));
    expect(out).toContain('9999 row(s)');
  });

  it('handles unicode', () => {
    const out = stripAnsi(
      formatTable({
        headers: ['m', 'country'],
        rows: [['sessions', '🇺🇸']],
        rowCount: 1,
      }),
    );
    expect(out).toContain('🇺🇸');
  });

  it('handles 100-row datasets without crashing', () => {
    const rows: string[][] = Array.from({ length: 100 }, (_, i) => [`v${i}`, `d${i}`]);
    const out = stripAnsi(formatTable({ headers: ['m', 'd'], rows, rowCount: 100 }));
    expect(out).toContain('100 row(s)');
    expect(out.split('\n').length).toBeGreaterThan(50);
  });
});
