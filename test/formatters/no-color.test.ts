import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ReportData } from '../../src/types/common.js';

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape codes literally are control chars
const ANSI = /\x1b\[/;

// Force colour support so a formatter that bypasses setColorEnabled() would emit ANSI here.
const data: ReportData = {
  headers: ['country', 'sessions'],
  rows: [
    ['RO', '100'],
    ['MD', '50'],
  ],
  rowCount: 2,
};

describe('formatters with colour disabled under a colour-capable terminal', () => {
  let mods: {
    formatTable: (d: ReportData) => string;
    formatChart: (d: ReportData) => string;
    setColorEnabled: (v: boolean) => void;
  };

  beforeAll(async () => {
    vi.stubEnv('FORCE_COLOR', '3');
    vi.stubEnv('NO_COLOR', '');
    vi.resetModules();
    const { formatTable } = await import('../../src/formatters/table.formatter.js');
    const { formatChart } = await import('../../src/formatters/chart.formatter.js');
    const { setColorEnabled } = await import('../../src/utils/style.js');
    mods = { formatTable, formatChart, setColorEnabled };
    mods.setColorEnabled(false);
  });

  afterAll(() => {
    mods.setColorEnabled(true);
    vi.unstubAllEnvs();
  });

  it('table emits no ANSI', () => {
    expect(mods.formatTable(data)).not.toMatch(ANSI);
  });

  it('chart emits no ANSI', () => {
    expect(mods.formatChart(data)).not.toMatch(ANSI);
  });
});
