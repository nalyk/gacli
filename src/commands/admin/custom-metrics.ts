import { Command } from 'commander';
import { formatOutput } from '../../formatters/index.js';
import * as adminApi from '../../services/admin-api.service.js';
import { type ReportData, resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';
import { createSpinner } from '../../utils/spinner.js';
import { validatePropertyId } from '../../validation/validators.js';

export function createCustomMetricsCommand(): Command {
  const cmd = new Command('custom-metrics').description('Manage GA4 custom metrics');

  cmd
    .command('list')
    .description('List custom metrics for a property')
    .action(async (_opts: Record<string, unknown>, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);
        const spinner = createSpinner('Fetching custom metrics...');
        spinner.start();

        const metrics = await adminApi.listCustomMetrics(propertyId);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Parameter Name', 'Display Name', 'Description', 'Scope', 'Measurement Unit'],
          rows: metrics.map((metric) => [
            metric.name ?? '',
            metric.parameterName ?? '',
            metric.displayName ?? '',
            metric.description ?? '',
            metric.scope ?? '',
            metric.measurementUnit ?? '',
          ]),
          rowCount: metrics.length,
        };

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  cmd
    .command('get')
    .description('Get a custom metric')
    .requiredOption('--name <resourceName>', 'Custom metric resource name')
    .action(async (opts: { name: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Fetching custom metric...');
        spinner.start();

        const metric = await adminApi.getCustomMetric(opts.name);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Parameter Name', 'Display Name', 'Description', 'Scope', 'Measurement Unit'],
          rows: [
            [
              metric.name ?? '',
              metric.parameterName ?? '',
              metric.displayName ?? '',
              metric.description ?? '',
              metric.scope ?? '',
              metric.measurementUnit ?? '',
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
    .description('Create a custom metric')
    .requiredOption('--parameter-name <parameterName>', 'Event parameter name')
    .requiredOption('--display-name <displayName>', 'Display name')
    .option('--description <description>', 'Description of the custom metric')
    .requiredOption('--scope <scope>', 'Metric scope (EVENT)')
    .requiredOption(
      '--measurement-unit <unit>',
      'Measurement unit (STANDARD, CURRENCY, FEET, METERS, KILOMETERS, MILES, MILLISECONDS, SECONDS, MINUTES, HOURS)',
    )
    .action(
      async (
        opts: {
          parameterName: string;
          displayName: string;
          description?: string;
          scope: string;
          measurementUnit: string;
        },
        command: Command,
      ) => {
        try {
          const globalOpts = resolveGlobalOptions(command);
          const propertyId = validatePropertyId(globalOpts.property);
          const spinner = createSpinner('Creating custom metric...');
          spinner.start();

          const metric = await adminApi.createCustomMetric({
            parent: `properties/${propertyId}`,
            parameterName: opts.parameterName,
            displayName: opts.displayName,
            description: opts.description,
            scope: opts.scope as 'EVENT',
            measurementUnit: opts.measurementUnit,
          });

          spinner.stop();

          const data: ReportData = {
            headers: ['Name', 'Parameter Name', 'Display Name', 'Description', 'Scope', 'Measurement Unit'],
            rows: [
              [
                metric.name ?? '',
                metric.parameterName ?? '',
                metric.displayName ?? '',
                metric.description ?? '',
                metric.scope ?? '',
                metric.measurementUnit ?? '',
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
    .description('Update a custom metric')
    .requiredOption('--name <resourceName>', 'Custom metric resource name')
    .option('--display-name <displayName>', 'New display name')
    .option('--description <description>', 'New description')
    .option('--measurement-unit <unit>', 'New measurement unit')
    .action(
      async (
        opts: {
          name: string;
          displayName?: string;
          description?: string;
          measurementUnit?: string;
        },
        command: Command,
      ) => {
        try {
          const globalOpts = resolveGlobalOptions(command);
          const spinner = createSpinner('Updating custom metric...');
          spinner.start();

          const metric = await adminApi.updateCustomMetric({
            name: opts.name,
            displayName: opts.displayName,
            description: opts.description,
            measurementUnit: opts.measurementUnit,
          });

          spinner.stop();

          const data: ReportData = {
            headers: ['Name', 'Parameter Name', 'Display Name', 'Description', 'Scope', 'Measurement Unit'],
            rows: [
              [
                metric.name ?? '',
                metric.parameterName ?? '',
                metric.displayName ?? '',
                metric.description ?? '',
                metric.scope ?? '',
                metric.measurementUnit ?? '',
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
    .description('Archive a custom metric')
    .requiredOption('--name <resourceName>', 'Custom metric resource name')
    .action(async (opts: { name: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Archiving custom metric...');
        spinner.start();

        await adminApi.archiveCustomMetric(opts.name);

        spinner.stop();

        const data: ReportData = {
          headers: ['Status', 'Custom Metric'],
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
