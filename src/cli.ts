import { Command } from 'commander';
import { LAZY_COMMANDS, targetCommand } from './command-registry.js';
import { detectAgent } from './core/agent.js';
import { finalizeProgram, runProgram } from './core/cli-adapter.js';
import { addGlobalOptions } from './types/common.js';
import { VERSION } from './version.js';

const program = new Command();

program.name('gacli').description('Google Analytics 4 CLI tool').version(VERSION);
addGlobalOptions(program);

for (const [name, { description }] of Object.entries(LAZY_COMMANDS)) {
  program.addCommand(new Command(name).description(description));
}

const target = targetCommand(addGlobalOptions(new Command()), process.argv.slice(2));
const lazy = target ? LAZY_COMMANDS[target] : undefined;
if (lazy?.load === 'operations') {
  const [{ mountOperations }, { OPERATIONS }] = await Promise.all([
    import('./core/cli-adapter.js'),
    import('./operations/index.js'),
  ]);
  mountOperations(program, OPERATIONS);
} else if (lazy) {
  const real = await lazy.load();
  // Swap the stub for the real command (addCommand wires the parent and inherited settings).
  const stubs = program.commands as Command[];
  stubs.splice(
    stubs.findIndex((c) => c.name() === target),
    1,
  );
  program.addCommand(real);
}

if (detectAgent()) {
  const { AGENT_HELP } = await import('./commands/schema/agent-help.js');
  program.addHelpText('beforeAll', AGENT_HELP);
}

finalizeProgram(program);
await runProgram(program);
