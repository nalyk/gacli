#!/usr/bin/env node

import { Command } from 'commander';
import { createAdminCommand } from './commands/admin/index.js';
import { createAudienceCommand } from './commands/audience/index.js';
import { createAuthCommand } from './commands/auth/index.js';
import { createConfigCommand } from './commands/config/index.js';
import { createExploreCommand } from './commands/explore/index.js';
import { createMcpCommand } from './commands/mcp/index.js';
import { createMetadataCommand } from './commands/metadata/index.js';
import { createReportCommand } from './commands/report/index.js';

const program = new Command();

program
  .name('gacli')
  .description('Google Analytics 4 CLI tool')
  .version('1.0.0')
  .option('-p, --property <id>', 'GA4 property ID')
  .option('-f, --format <format>', 'Output format: table, json, ndjson, csv, chart', 'table')
  .option('-o, --output <file>', 'Write output to file')
  .option('--no-color', 'Disable colored output')
  .option('-v, --verbose', 'Enable verbose logging');

program.addCommand(createReportCommand());
program.addCommand(createMetadataCommand());
program.addCommand(createAudienceCommand());
program.addCommand(createAdminCommand());
program.addCommand(createConfigCommand());
program.addCommand(createAuthCommand());
program.addCommand(createExploreCommand());
program.addCommand(createMcpCommand());

program.parse();
