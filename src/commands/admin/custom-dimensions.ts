import { Command } from 'commander';
import { formatOutput } from '../../formatters/index.js';
import * as adminApi from '../../services/admin-api.service.js';
import { type ReportData, resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';
import { createSpinner } from '../../utils/spinner.js';
import { validatePropertyId } from '../../validation/validators.js';

export function createCustomDimensionsCommand(): Command {
  const cmd = new Command('custom-dimensions').description('Manage GA4 custom dimensions');

  cmd
    .command('list')
    .description('List custom dimensions for a property')
    .action(async (_opts: Record<string, unknown>, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);
        const spinner = createSpinner('Fetching custom dimensions...');
        spinner.start();

        const dimensions = await adminApi.listCustomDimensions(propertyId);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Parameter Name', 'Display Name', 'Description', 'Scope'],
          rows: dimensions.map((dim) => [
            dim.name ?? '',
            dim.parameterName ?? '',
            dim.displayName ?? '',
            dim.description ?? '',
            dim.scope ?? '',
          ]),
          rowCount: dimensions.length,
        };

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  cmd
    .command('get')
    .description('Get a custom dimension')
    .requiredOption('--name <resourceName>', 'Custom dimension resource name')
    .action(async (opts: { name: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Fetching custom dimension...');
        spinner.start();

        const dimension = await adminApi.getCustomDimension(opts.name);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Parameter Name', 'Display Name', 'Description', 'Scope'],
          rows: [
            [
              dimension.name ?? '',
              dimension.parameterName ?? '',
              dimension.displayName ?? '',
              dimension.description ?? '',
              dimension.scope ?? '',
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
    .description('Create a custom dimension')
    .requiredOption('--parameter-name <parameterName>', 'Event parameter name')
    .requiredOption('--display-name <displayName>', 'Display name')
    .option('--description <description>', 'Description of the custom dimension')
    .requiredOption('--scope <scope>', 'Dimension scope (EVENT, USER, ITEM)')
    .action(
      async (
        opts: {
          parameterName: string;
          displayName: string;
          description?: string;
          scope: string;
        },
        command: Command,
      ) => {
        try {
          const globalOpts = resolveGlobalOptions(command);
          const propertyId = validatePropertyId(globalOpts.property);
          const spinner = createSpinner('Creating custom dimension...');
          spinner.start();

          const dimension = await adminApi.createCustomDimension({
            parent: `properties/${propertyId}`,
            parameterName: opts.parameterName,
            displayName: opts.displayName,
            description: opts.description,
            scope: opts.scope as 'EVENT' | 'USER' | 'ITEM',
          });

          spinner.stop();

          const data: ReportData = {
            headers: ['Name', 'Parameter Name', 'Display Name', 'Description', 'Scope'],
            rows: [
              [
                dimension.name ?? '',
                dimension.parameterName ?? '',
                dimension.displayName ?? '',
                dimension.description ?? '',
                dimension.scope ?? '',
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
    .description('Update a custom dimension')
    .requiredOption('--name <resourceName>', 'Custom dimension resource name')
    .option('--display-name <displayName>', 'New display name')
    .option('--description <description>', 'New description')
    .action(
      async (
        opts: {
          name: string;
          displayName?: string;
          description?: string;
        },
        command: Command,
      ) => {
        try {
          const globalOpts = resolveGlobalOptions(command);
          const spinner = createSpinner('Updating custom dimension...');
          spinner.start();

          const dimension = await adminApi.updateCustomDimension({
            name: opts.name,
            displayName: opts.displayName,
            description: opts.description,
          });

          spinner.stop();

          const data: ReportData = {
            headers: ['Name', 'Parameter Name', 'Display Name', 'Description', 'Scope'],
            rows: [
              [
                dimension.name ?? '',
                dimension.parameterName ?? '',
                dimension.displayName ?? '',
                dimension.description ?? '',
                dimension.scope ?? '',
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
    .command('archive')
    .description('Archive a custom dimension')
    .requiredOption('--name <resourceName>', 'Custom dimension resource name')
    .action(async (opts: { name: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Archiving custom dimension...');
        spinner.start();

        await adminApi.archiveCustomDimension(opts.name);

        spinner.stop();

        const data: ReportData = {
          headers: ['Status', 'Custom Dimension'],
          rows: [['Archived', opts.name]],
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
