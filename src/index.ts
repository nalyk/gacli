#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { createAdminCommand } from './commands/admin/index.js';
import { createAudienceCommand } from './commands/audience/index.js';
import { createAuthCommand } from './commands/auth/index.js';
import { createConfigCommand } from './commands/config/index.js';
import { createExploreCommand } from './commands/explore/index.js';
import { createMcpCommand } from './commands/mcp/index.js';
import { createMetadataCommand } from './commands/metadata/index.js';
import { createReportCommand } from './commands/report/index.js';
import { createSkillsCommand } from './commands/skills/index.js';

// Single source of truth for the version: read from package.json at runtime.
// In dev (tsx src/index.ts) and prod (dist/index.js) the package.json is at ../.
const pkgVersion = (() => {
  const here = dirname(fileURLToPath(import.meta.url));
  const { version } = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf-8')) as {
    version: string;
  };
  return version;
})();

const program = new Command();

program
  .name('gacli')
  .description('Google Analytics 4 CLI tool')
  .version(pkgVersion)
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
program.addCommand(createSkillsCommand());

program.parse();
