import type { ReportData } from '../types/common.js';

/** The `-f json` object for a report: rows become objects keyed by header. */
export function reportToJson(data: ReportData): Record<string, unknown> {
  const objects = data.rows.map((row) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < data.headers.length; i++) {
      obj[data.headers[i]] = row[i] ?? '';
    }
    return obj;
  });

  const output: Record<string, unknown> = {
    rowCount: data.rowCount,
    data: objects,
  };

  if (data.metadata && Object.keys(data.metadata).length > 0) {
    output.metadata = data.metadata;
  }

  return output;
}

export function formatJson(data: ReportData, opts: { pretty?: boolean } = {}): string {
  const output = reportToJson(data);
  return opts.pretty === false ? JSON.stringify(output) : JSON.stringify(output, null, 2);
}
