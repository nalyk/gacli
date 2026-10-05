import { writeFileSync } from 'node:fs';
import type { Command } from 'commander';
import { detectAgent, isCI, isInteractive } from '../core/agent.js';
import { GacliError, setJsonErrors } from '../core/errors.js';
import { getConfig } from '../services/config.service.js';
import { logger } from '../utils/logger.js';

export const OUTPUT_FORMATS = ['table', 'json', 'ndjson', 'csv', 'chart'] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export function isOutputFormat(value: string): value is OutputFormat {
  return (OUTPUT_FORMATS as readonly string[]).includes(value);
}

export interface GlobalOptions {
  property: string;
  format: OutputFormat;
  output?: string;
  noColor: boolean;
  verbose: boolean;
  /** true when the user chose the format (-f, GACLI_FORMAT or config) rather than auto-detection */
  formatExplicit: boolean;
  interactive: boolean;
  agent?: string;
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
    .option(
      '-f, --format <format>',
      'Output format: table, json, ndjson, csv, chart (default: table on a terminal, json when piped or run by an agent)',
    )
    .option('-o, --output <file>', 'Write output to file')
    .option('--no-color', 'Disable colored output')
    .option('-v, --verbose', 'Enable verbose logging');
}

function validOrWarn(value: string | undefined, source: string): OutputFormat | undefined {
  if (!value) return undefined;
  if (isOutputFormat(value)) return value;
  logger.warn(`Ignoring invalid ${source} "${value}". Valid: ${OUTPUT_FORMATS.join(', ')}`);
  return undefined;
}

export function resolveGlobalOptions(cmd: Command): GlobalOptions {
  const opts = cmd.optsWithGlobals();
  const config = getConfig();

  const property = opts.property || config.property || process.env.GA4_PROPERTY_ID || '';
  const agent = detectAgent();
  // An explicit bad -f is a usage error; a stale env/config value must not break every command.
  if (opts.format && !isOutputFormat(opts.format)) {
    setJsonErrors(!(process.stdout.isTTY && !agent && !isCI()));
    throw new GacliError('usage', `Invalid format "${opts.format}". Valid: ${OUTPUT_FORMATS.join(', ')}`);
  }
  const preferred =
    opts.format ||
    validOrWarn(process.env.GACLI_FORMAT, 'GACLI_FORMAT') ||
    validOrWarn(config.format, 'config format');
  // Auto: humans at a terminal get tables; pipes, CI and agents get JSON.
  const format: OutputFormat = preferred || (process.stdout.isTTY && !agent && !isCI() ? 'table' : 'json');
  setJsonErrors(format === 'json' || format === 'ndjson');
  // commander stores `--no-color` as `color: false` (default true), never as `noColor`
  const noColor = opts.color === false || (config.noColor ?? false);
  const verbose = opts.verbose ?? config.verbose ?? false;
  const output = opts.output;

  if (verbose) {
    logger.setVerbose(true);
  }
  if (noColor) {
    logger.setNoColor(true);
  }

  return {
    property,
    format,
    output,
    noColor,
    verbose,
    formatExplicit: !!preferred,
    interactive: isInteractive(),
    agent,
  };
}

export function writeOutput(content: string, options: GlobalOptions): void {
  if (options.output) {
    writeFileSync(options.output, content, 'utf-8');
    logger.success(`Output written to ${options.output}`);
  } else {
    console.log(content);
  }
}
