import { Command } from 'commander';
import { getConfigValue } from '../../services/config.service.js';
import { CONFIG_KEYS } from '../../types/config.js';
import { logger } from '../../utils/logger.js';
import { handleError } from '../../utils/error-handler.js';

export function createGetCommand(): Command {
  const cmd = new Command('get')
    .description('Get a configuration value')
    .argument('<key>', `Config key (${Object.keys(CONFIG_KEYS).join(', ')})`)
    .action((key: string) => {
      try {
        if (!(key in CONFIG_KEYS)) {
          logger.error(
            `Unknown config key: ${key}\nValid keys: ${Object.keys(CONFIG_KEYS).join(', ')}`,
          );
          process.exit(1);
        }

        const value = getConfigValue(key);
        if (value !== undefined) {
          console.log(value);
        } else {
          logger.info(`${key} is not set`);
        }
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
