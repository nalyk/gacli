import { Command } from 'commander';
import { createCheckCompatibilityCommand } from './compatibility.js';

export function createMetadataCommand(): Command {
  const cmd = new Command('metadata').description(
    'GA4 metadata operations (dimensions, metrics, compatibility)',
  );

  cmd.addCommand(createCheckCompatibilityCommand());

  return cmd;
}
