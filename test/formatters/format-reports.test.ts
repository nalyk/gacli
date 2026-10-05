import { describe, expect, it } from 'vitest';
import { formatOutput, formatReports } from '../../src/formatters/index.js';
import type { ReportData } from '../../src/types/common.js';

const r1: ReportData = { headers: ['country', 'sessions'], rows: [['RO', '100']], rowCount: 1 };
const r2: ReportData = {
  headers: ['device', 'users'],
  rows: [
    ['mobile', '5'],
    ['desktop', '3'],
  ],
  rowCount: 2,
};

describe('formatReports', () => {
  it('json: emits one array document with each report envelope', () => {
    const parsed = JSON.parse(formatReports([r1, r2], 'json'));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].rowCount).toBe(1);
    expect(parsed[1].rowCount).toBe(2);
  });

  it('ndjson: every line is an object tagged with its 1-based report index', () => {
    const lines = formatReports([r1, r2], 'ndjson').trim().split('\n');
    expect(lines).toHaveLength(3);
    const reports = lines.map((l) => JSON.parse(l).report);
    expect(reports).toEqual([1, 2, 2]);
  });

  it('table: separates sections with a label', () => {
    const out = formatReports([r1, r2], 'table', 'Pivot Report');
    expect(out).toContain('--- Pivot Report 1 ---');
    expect(out).toContain('--- Pivot Report 2 ---');
  });

  it('a single report is identical to formatOutput', () => {
    expect(formatReports([r1], 'json')).toBe(formatOutput(r1, 'json'));
    expect(formatReports([r1], 'table')).toBe(formatOutput(r1, 'table'));
  });
});

describe('formatOutput json pretty-printing follows stdout', () => {
  it('is compact when stdout is not a TTY', () => {
    const original = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });
    try {
      expect(formatOutput(r1, 'json')).not.toContain('\n');
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', { value: original, configurable: true });
    }
  });

  it('is pretty on a TTY', () => {
    const original = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    try {
      expect(formatOutput(r1, 'json')).toContain('\n');
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', { value: original, configurable: true });
    }
  });
});
