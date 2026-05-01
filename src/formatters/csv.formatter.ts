import type { ReportData } from '../types/common.js';

/**
 * Escape a single CSV field according to RFC 4180.
 *
 * A field is wrapped in double-quotes when it contains a comma, a
 * double-quote, a newline, or leading/trailing whitespace.  Any
 * embedded double-quotes are doubled ("").
 */
function escapeField(value: string): string {
  const needsQuoting =
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r') ||
    value.startsWith(' ') ||
    value.endsWith(' ');

  if (needsQuoting) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function rowToCsv(fields: string[]): string {
  return fields.map(escapeField).join(',');
}

export function formatCsv(data: ReportData): string {
  const lines: string[] = [];

  // Header row
  lines.push(rowToCsv(data.headers));

  // Data rows
  for (const row of data.rows) {
    lines.push(rowToCsv(row));
  }

  return lines.join('\n');
}
