import { Command } from 'commander';
import { createAuthCommand } from './commands/auth/index.js';
import { createConfigCommand } from './commands/config/index.js';
import { createExploreCommand } from './commands/explore/index.js';
import { createMcpCommand } from './commands/mcp/index.js';
import { AGENT_HELP, createSchemaCommand } from './commands/schema/index.js';
import { createSkillsCommand } from './commands/skills/index.js';
import { detectAgent } from './core/agent.js';
import { finalizeProgram, mountOperations, runProgram } from './core/cli-adapter.js';
import { OPERATIONS } from './operations/index.js';
import { addGlobalOptions } from './types/common.js';
import { VERSION } from './version.js';

const program = new Command();

program.name('gacli').description('Google Analytics 4 CLI tool').version(VERSION);
addGlobalOptions(program);

program.addCommand(createConfigCommand());
program.addCommand(createAuthCommand());
program.addCommand(createExploreCommand());
program.addCommand(createMcpCommand());
program.addCommand(createSkillsCommand());
program.addCommand(createSchemaCommand(OPERATIONS));
if (detectAgent()) program.addHelpText('beforeAll', AGENT_HELP);

mountOperations(program, OPERATIONS);
finalizeProgram(program);
await runProgram(program);
