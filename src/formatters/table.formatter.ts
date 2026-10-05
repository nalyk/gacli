import Table from 'cli-table3';
import type { ReportData } from '../types/common.js';
import { style } from '../utils/style.js';

export function formatTable(data: ReportData): string {
  if (data.rows.length === 0) {
    return style('yellow', 'No data returned.');
  }

  const table = new Table({
    head: data.headers.map((h) => style(['cyan', 'bold'], h)),
    style: { head: [], border: [] },
  });

  for (const row of data.rows) {
    table.push(row);
  }

  return `${table.toString()}\n${style('gray', `${data.rowCount} row(s)`)}`;
}
