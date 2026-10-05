import { createRequire } from 'node:module';
import type { ReportData } from '../types/common.js';
import { style } from '../utils/style.js';

// cli-table3 is CommonJS: require it synchronously on first use so non-table output never loads it.
let Table: typeof import('cli-table3') | undefined;

export function formatTable(data: ReportData): string {
  if (data.rows.length === 0) {
    return style('yellow', 'No data returned.');
  }

  Table ??= createRequire(import.meta.url)('cli-table3') as typeof import('cli-table3');
  const table = new Table({
    head: data.headers.map((h) => style(['cyan', 'bold'], h)),
    style: { head: [], border: [] },
  });

  for (const row of data.rows) {
    table.push(row);
  }

  return `${table.toString()}\n${style('gray', `${data.rowCount} row(s)`)}`;
}
