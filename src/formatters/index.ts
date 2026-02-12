import { type ReportData, type OutputFormat } from '../types/common.js';
import { formatTable } from './table.formatter.js';
import { formatJson } from './json.formatter.js';
import { formatCsv } from './csv.formatter.js';
import { formatChart } from './chart.formatter.js';

export function formatOutput(data: ReportData, format: OutputFormat): string {
  switch (format) {
    case 'table':
      return formatTable(data);
    case 'json':
      return formatJson(data);
    case 'csv':
      return formatCsv(data);
    case 'chart':
      return formatChart(data);
    default:
      return formatTable(data);
  }
}

export { formatTable } from './table.formatter.js';
export { formatJson } from './json.formatter.js';
export { formatCsv } from './csv.formatter.js';
export { formatChart } from './chart.formatter.js';
