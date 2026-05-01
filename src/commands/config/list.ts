import { Command } from 'commander';
import { formatOutput } from '../../formatters/index.js';
import { listConfig } from '../../services/config.service.js';
import { type ReportData, resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { CONFIG_KEYS } from '../../types/config.js';
import { handleError } from '../../utils/error-handler.js';

export function createListCommand(): Command {
  const cmd = new Command('list')
    .description('List all configuration values')
    .action((_opts: Record<string, unknown>, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const config = listConfig();

        const rows: string[][] = Object.entries(CONFIG_KEYS).map(([key, description]) => {
          const value = (config as Record<string, unknown>)[key];
          return [key, value !== undefined ? String(value) : '(not set)', description];
        });

        const data: ReportData = {
          headers: ['Key', 'Value', 'Description'],
          rows,
          rowCount: rows.length,
        };

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
