import { Command } from 'commander';
import { createCheckCompatibilityCommand } from './compatibility.js';
import { createGetCommand } from './get.js';

export function createMetadataCommand(): Command {
  const cmd = new Command('metadata').description(
    'GA4 metadata operations (dimensions, metrics, compatibility)',
  );

  cmd.addCommand(createGetCommand());
  cmd.addCommand(createCheckCompatibilityCommand());

  return cmd;
}
