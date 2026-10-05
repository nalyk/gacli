import { Command } from 'commander';
import { GacliError } from '../../core/errors.js';
import { getConfigValue } from '../../services/config.service.js';
import { resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { CONFIG_KEYS } from '../../types/config.js';
import { handleError } from '../../utils/error-handler.js';
import { logger } from '../../utils/logger.js';

export function createGetCommand(): Command {
  const cmd = new Command('get')
    .description('Get a configuration value')
    .argument('<key>', `Config key (${Object.keys(CONFIG_KEYS).join(', ')})`)
    .action((key: string, _opts: unknown, command: Command) => {
      try {
        const globals = resolveGlobalOptions(command);
        if (!(key in CONFIG_KEYS)) {
          throw new GacliError(
            'usage',
            `Unknown config key: ${key}. Valid keys: ${Object.keys(CONFIG_KEYS).join(', ')}`,
          );
        }

        const value = getConfigValue(key);
        if (value !== undefined) {
          writeOutput(value, globals);
        } else {
          logger.info(`${key} is not set`);
        }
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
