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
import { finalizeProgram, mountOperations, runProgram } from './core/cli-adapter.js';
import { OPERATIONS } from './operations/index.js';
import { addGlobalOptions } from './types/common.js';
import { VERSION } from './version.js';

const program = new Command();

program.name('gacli').description('Google Analytics 4 CLI tool').version(VERSION);
addGlobalOptions(program);

program.addCommand(createReportCommand());
program.addCommand(createMetadataCommand());
program.addCommand(createAudienceCommand());
program.addCommand(createAdminCommand());
program.addCommand(createConfigCommand());
program.addCommand(createAuthCommand());
program.addCommand(createExploreCommand());
program.addCommand(createMcpCommand());
program.addCommand(createSkillsCommand());

mountOperations(program, OPERATIONS);
finalizeProgram(program);
await runProgram(program);
