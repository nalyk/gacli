import { Command } from 'commander';
import { resolveGlobalOptions, writeOutput, type ReportData } from '../../types/common.js';
import { formatOutput } from '../../formatters/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { handleError } from '../../utils/error-handler.js';
import { validatePropertyId } from '../../validation/validators.js';
import * as adminApi from '../../services/admin-api.service.js';

export function createBigQueryLinksCommand(): Command {
  const cmd = new Command('bigquery-links').description('Manage GA4 BigQuery links');

  cmd
    .command('list')
    .description('List BigQuery links for a property')
    .action(async (_opts: Record<string, unknown>, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);
        const spinner = createSpinner('Fetching BigQuery links...');
        spinner.start();

        const links = await adminApi.listBigQueryLinks(propertyId);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Project', 'Daily Export Enabled', 'Streaming Export Enabled', 'Create Time'],
          rows: links.map((link) => [
            link.name ?? '',
            link.project ?? '',
            String(link.dailyExportEnabled ?? ''),
            String(link.streamingExportEnabled ?? ''),
            link.createTime ?? '',
          ]),
          rowCount: links.length,
        };

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  cmd
    .command('get')
    .description('Get a BigQuery link')
    .requiredOption('--name <resourceName>', 'BigQuery link resource name')
    .action(async (opts: { name: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Fetching BigQuery link...');
        spinner.start();

        const link = await adminApi.getBigQueryLink(opts.name);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Project', 'Daily Export Enabled', 'Streaming Export Enabled', 'Create Time'],
          rows: [
            [
              link.name ?? '',
              link.project ?? '',
              String(link.dailyExportEnabled ?? ''),
              String(link.streamingExportEnabled ?? ''),
              link.createTime ?? '',
            ],
          ],
          rowCount: 1,
        };

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  cmd
    .command('create')
    .description('Create a BigQuery link')
    .requiredOption('--project <projectId>', 'Google Cloud project ID')
    .option('--daily-export-enabled <enabled>', 'Enable daily export (true/false)', 'true')
    .option('--streaming-export-enabled <enabled>', 'Enable streaming export (true/false)', 'false')
    .action(
      async (
        opts: {
          project: string;
          dailyExportEnabled: string;
          streamingExportEnabled: string;
        },
        command: Command,
      ) => {
        try {
          const globalOpts = resolveGlobalOptions(command);
          const propertyId = validatePropertyId(globalOpts.property);
          const spinner = createSpinner('Creating BigQuery link...');
          spinner.start();

          const link = await adminApi.createBigQueryLink({
            parent: `properties/${propertyId}`,
            project: opts.project,
            dailyExportEnabled: opts.dailyExportEnabled === 'true',
            streamingExportEnabled: opts.streamingExportEnabled === 'true',
          });

          spinner.stop();

          const data: ReportData = {
            headers: ['Name', 'Project', 'Daily Export Enabled', 'Streaming Export Enabled', 'Create Time'],
            rows: [
              [
                link.name ?? '',
                link.project ?? '',
                String(link.dailyExportEnabled ?? ''),
                String(link.streamingExportEnabled ?? ''),
                link.createTime ?? '',
              ],
            ],
            rowCount: 1,
          };

          const output = formatOutput(data, globalOpts.format);
          writeOutput(output, globalOpts);
        } catch (error) {
          handleError(error);
        }
      },
    );

  cmd
    .command('delete')
    .description('Delete a BigQuery link')
    .requiredOption('--name <resourceName>', 'BigQuery link resource name')
    .action(async (opts: { name: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Deleting BigQuery link...');
        spinner.start();

        await adminApi.deleteBigQueryLink(opts.name);

        spinner.stop();

        const data: ReportData = {
          headers: ['Status', 'BigQuery Link'],
          rows: [['Deleted', opts.name]],
          rowCount: 1,
        };

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
