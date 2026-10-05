import { Command } from 'commander';
import { setConfigValue } from '../../services/config.service.js';
import { CONFIG_KEYS } from '../../types/config.js';
import { handleError } from '../../utils/error-handler.js';
import { logger } from '../../utils/logger.js';

export function createSetCommand(): Command {
  const cmd = new Command('set')
    .description('Set a configuration value')
    .argument('<key>', `Config key (${Object.keys(CONFIG_KEYS).join(', ')})`)
    .argument('<value>', 'Value to set')
    .action((key: string, value: string) => {
      try {
        if (!(key in CONFIG_KEYS)) {
          throw new Error(`Unknown config key: ${key}. Valid keys: ${Object.keys(CONFIG_KEYS).join(', ')}`);
        }

        setConfigValue(key, value);
        logger.success(`Set ${key} = ${value}`);
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
