import { Command } from 'commander';
import { formatOutput } from '../../formatters/index.js';
import * as adminApi from '../../services/admin-api.service.js';
import { type ReportData, resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';
import { createSpinner } from '../../utils/spinner.js';

export function createAccountsCommand(): Command {
  const cmd = new Command('accounts').description('Manage GA4 accounts');

  cmd
    .command('list')
    .description('List all GA4 accounts accessible by the caller')
    .action(async (_opts: Record<string, unknown>, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Fetching accounts...');
        spinner.start();

        const accounts = await adminApi.listAccounts();

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Display Name', 'Create Time', 'Update Time', 'Region Code'],
          rows: accounts.map((account) => [
            account.name ?? '',
            account.displayName ?? '',
            account.createTime ?? '',
            account.updateTime ?? '',
            account.regionCode ?? '',
          ]),
          rowCount: accounts.length,
        };

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
