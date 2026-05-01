import { writeFileSync } from 'node:fs';
import type { Command } from 'commander';
import { getConfig } from '../services/config.service.js';
import { logger } from '../utils/logger.js';

export type OutputFormat = 'table' | 'json' | 'ndjson' | 'csv' | 'chart';

export interface GlobalOptions {
  property: string;
  format: OutputFormat;
  output?: string;
  noColor: boolean;
  verbose: boolean;
}

export interface ReportData {
  headers: string[];
  rows: string[][];
  rowCount: number;
  metadata?: Record<string, unknown>;
}

export function resolveGlobalOptions(cmd: Command): GlobalOptions {
  const opts = cmd.optsWithGlobals();
  const config = getConfig();

  const property = opts.property || config.property || process.env.GA4_PROPERTY_ID || '';
  const format = opts.format || config.format || 'table';
  const noColor = opts.noColor ?? config.noColor ?? false;
  const verbose = opts.verbose ?? config.verbose ?? false;
  const output = opts.output;

  if (verbose) {
    logger.setVerbose(true);
  }
  if (noColor) {
    logger.setNoColor(true);
  }

  return { property, format: format as OutputFormat, output, noColor, verbose };
}

export function writeOutput(content: string, options: GlobalOptions): void {
  if (options.output) {
    writeFileSync(options.output, content, 'utf-8');
    logger.success(`Output written to ${options.output}`);
  } else {
    console.log(content);
  }
}
