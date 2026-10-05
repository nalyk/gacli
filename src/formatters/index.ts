import type { OutputFormat, ReportData } from '../types/common.js';
import { formatChart } from './chart.formatter.js';
import { formatCsv } from './csv.formatter.js';
import { formatJson } from './json.formatter.js';
import { formatNdjson } from './ndjson.formatter.js';
import { formatTable } from './table.formatter.js';

export function formatOutput(data: ReportData, format: OutputFormat): string {
  switch (format) {
    case 'table':
      return formatTable(data);
    case 'json':
      return formatJson(data, { pretty: !!process.stdout.isTTY });
    case 'ndjson':
      return formatNdjson(data);
    case 'csv':
      return formatCsv(data);
    case 'chart':
      return formatChart(data);
    default:
      return formatTable(data);
  }
}

export function formatReports(reports: ReportData[], format: OutputFormat, label = 'Report'): string {
  if (reports.length === 1) return formatOutput(reports[0], format);

  if (format === 'json') {
    return JSON.stringify(
      reports.map((r) => JSON.parse(formatJson(r))),
      null,
      process.stdout.isTTY ? 2 : undefined,
    );
  }

  if (format === 'ndjson') {
    return reports
      .map((r, i) =>
        formatNdjson(r)
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.stringify({ report: i + 1, ...JSON.parse(line) }))
          .join('\n'),
      )
      .filter(Boolean)
      .join('\n')
      .concat('\n');
  }

  return reports.map((r, i) => `--- ${label} ${i + 1} ---\n${formatOutput(r, format)}`).join('\n\n');
}

export { formatChart } from './chart.formatter.js';
export { formatCsv } from './csv.formatter.js';
export { formatJson } from './json.formatter.js';
export { formatNdjson } from './ndjson.formatter.js';
export { formatTable } from './table.formatter.js';
