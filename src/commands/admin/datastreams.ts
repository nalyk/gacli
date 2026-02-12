import { Command } from 'commander';
import { resolveGlobalOptions, writeOutput, type ReportData } from '../../types/common.js';
import { formatOutput } from '../../formatters/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { handleError } from '../../utils/error-handler.js';
import { validatePropertyId } from '../../validation/validators.js';
import * as adminApi from '../../services/admin-api.service.js';

export function createDataStreamsCommand(): Command {
  const cmd = new Command('datastreams').description('Manage GA4 data streams');

  cmd
    .command('list')
    .description('List data streams for a property')
    .action(async (_opts: Record<string, unknown>, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);
        const spinner = createSpinner('Fetching data streams...');
        spinner.start();

        const streams = await adminApi.listDataStreams(propertyId);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Type', 'Display Name', 'Create Time', 'Update Time'],
          rows: streams.map((stream) => [
            stream.name ?? '',
            stream.type ?? '',
            stream.displayName ?? '',
            stream.createTime ?? '',
            stream.updateTime ?? '',
          ]),
          rowCount: streams.length,
        };

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  cmd
    .command('get')
    .description('Get a data stream')
    .requiredOption('--name <resourceName>', 'Data stream resource name')
    .action(async (opts: { name: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Fetching data stream...');
        spinner.start();

        const stream = await adminApi.getDataStream(opts.name);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Type', 'Display Name', 'Create Time', 'Update Time'],
          rows: [
            [
              stream.name ?? '',
              stream.type ?? '',
              stream.displayName ?? '',
              stream.createTime ?? '',
              stream.updateTime ?? '',
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
    .description('Create a data stream')
    .requiredOption(
      '--type <streamType>',
      'Data stream type (WEB_DATA_STREAM, ANDROID_APP_DATA_STREAM, IOS_APP_DATA_STREAM)',
    )
    .requiredOption('--display-name <name>', 'Display name for the data stream')
    .option('--uri <uri>', 'Web stream URI (for WEB_DATA_STREAM)')
    .option('--package-name <packageName>', 'Android package name (for ANDROID_APP_DATA_STREAM)')
    .option('--bundle-id <bundleId>', 'iOS bundle ID (for IOS_APP_DATA_STREAM)')
    .action(
      async (
        opts: {
          type: string;
          displayName: string;
          uri?: string;
          packageName?: string;
          bundleId?: string;
        },
        command: Command,
      ) => {
        try {
          const globalOpts = resolveGlobalOptions(command);
          const propertyId = validatePropertyId(globalOpts.property);
          const spinner = createSpinner('Creating data stream...');
          spinner.start();

          const stream = await adminApi.createDataStream({
            parent: `properties/${propertyId}`,
            type: opts.type as 'WEB_DATA_STREAM' | 'ANDROID_APP_DATA_STREAM' | 'IOS_APP_DATA_STREAM',
            displayName: opts.displayName,
            webStreamData: opts.uri ? { defaultUri: opts.uri } : undefined,
            androidAppStreamData: opts.packageName ? { packageName: opts.packageName } : undefined,
            iosAppStreamData: opts.bundleId ? { bundleId: opts.bundleId } : undefined,
          });

          spinner.stop();

          const data: ReportData = {
            headers: ['Name', 'Type', 'Display Name', 'Create Time'],
            rows: [
              [
                stream.name ?? '',
                stream.type ?? '',
                stream.displayName ?? '',
                stream.createTime ?? '',
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
    .command('update')
    .description('Update a data stream')
    .requiredOption('--name <resourceName>', 'Data stream resource name')
    .requiredOption('--display-name <name>', 'New display name')
    .action(async (opts: { name: string; displayName: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Updating data stream...');
        spinner.start();

        const stream = await adminApi.updateDataStream({
          name: opts.name,
          displayName: opts.displayName,
        });

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Type', 'Display Name', 'Update Time'],
          rows: [
            [
              stream.name ?? '',
              stream.type ?? '',
              stream.displayName ?? '',
              stream.updateTime ?? '',
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
    .command('delete')
    .description('Delete a data stream')
    .requiredOption('--name <resourceName>', 'Data stream resource name')
    .action(async (opts: { name: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Deleting data stream...');
        spinner.start();

        await adminApi.deleteDataStream(opts.name);

        spinner.stop();

        const data: ReportData = {
          headers: ['Status', 'Data Stream'],
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
