import { writeFileSync } from 'node:fs';
import type { Command } from 'commander';
import { getConfig } from '../services/config.service.js';
import { logger } from '../utils/logger.js';

export const OUTPUT_FORMATS = ['table', 'json', 'ndjson', 'csv', 'chart'] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

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

export function addGlobalOptions(program: Command): Command {
  return program
    .option('-p, --property <id>', 'GA4 property ID')
    .option('-f, --format <format>', 'Output format: table, json, ndjson, csv, chart (default: table)')
    .option('-o, --output <file>', 'Write output to file')
    .option('--no-color', 'Disable colored output')
    .option('-v, --verbose', 'Enable verbose logging');
}

export function resolveGlobalOptions(cmd: Command): GlobalOptions {
  const opts = cmd.optsWithGlobals();
  const config = getConfig();

  const property = opts.property || config.property || process.env.GA4_PROPERTY_ID || '';
  const format = opts.format || config.format || 'table';
  if (!(OUTPUT_FORMATS as readonly string[]).includes(format)) {
    throw new Error(`Invalid format "${format}". Valid: ${OUTPUT_FORMATS.join(', ')}`);
  }
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
