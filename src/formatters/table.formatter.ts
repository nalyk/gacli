import type { ReportData } from '../types/common.js';
import { loadCliTable } from '../utils/lazy-cjs.js';
import { style } from '../utils/style.js';

export function formatTable(data: ReportData): string {
  if (data.rows.length === 0) {
    return style('yellow', 'No data returned.');
  }

  // cli-table3 is loaded on first table render, so other output formats never pay for it.
  const Table = loadCliTable();
  const table = new Table({
    head: data.headers.map((h) => style(['cyan', 'bold'], h)),
    style: { head: [], border: [] },
  });

  for (const row of data.rows) {
    table.push(row);
  }

  return `${table.toString()}\n${style('gray', `${data.rowCount} row(s)`)}`;
}
