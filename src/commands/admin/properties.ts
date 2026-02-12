import { Command } from 'commander';
import { resolveGlobalOptions, writeOutput, type ReportData } from '../../types/common.js';
import { formatOutput } from '../../formatters/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { handleError } from '../../utils/error-handler.js';
import { validatePropertyId } from '../../validation/validators.js';
import * as adminApi from '../../services/admin-api.service.js';

export function createPropertiesCommand(): Command {
  const cmd = new Command('properties').description('Manage GA4 properties');

  cmd
    .command('list')
    .description('List GA4 properties under an account')
    .requiredOption('--account <accountId>', 'GA4 account ID')
    .action(async (opts: { account: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Fetching properties...');
        spinner.start();

        const properties = await adminApi.listProperties(opts.account);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Display Name', 'Time Zone', 'Currency Code', 'Industry Category', 'Create Time'],
          rows: properties.map((prop) => [
            prop.name ?? '',
            prop.displayName ?? '',
            prop.timeZone ?? '',
            prop.currencyCode ?? '',
            prop.industryCategory ?? '',
            prop.createTime ?? '',
          ]),
          rowCount: properties.length,
        };

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  cmd
    .command('get')
    .description('Get a GA4 property')
    .action(async (_opts: Record<string, unknown>, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);
        const spinner = createSpinner('Fetching property...');
        spinner.start();

        const property = await adminApi.getProperty(propertyId);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Display Name', 'Time Zone', 'Currency Code', 'Industry Category', 'Create Time'],
          rows: [
            [
              property.name ?? '',
              property.displayName ?? '',
              property.timeZone ?? '',
              property.currencyCode ?? '',
              property.industryCategory ?? '',
              property.createTime ?? '',
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
    .description('Create a new GA4 property')
    .requiredOption('--account <accountId>', 'GA4 account ID')
    .requiredOption('--display-name <name>', 'Display name for the property')
    .requiredOption('--time-zone <timeZone>', 'Reporting time zone (e.g., America/New_York)')
    .option('--currency-code <code>', 'Currency code (e.g., USD)')
    .option('--industry-category <category>', 'Industry category')
    .action(
      async (
        opts: {
          account: string;
          displayName: string;
          timeZone: string;
          currencyCode?: string;
          industryCategory?: string;
        },
        command: Command,
      ) => {
        try {
          const globalOpts = resolveGlobalOptions(command);
          const spinner = createSpinner('Creating property...');
          spinner.start();

          const property = await adminApi.createProperty({
            parent: opts.account,
            displayName: opts.displayName,
            timeZone: opts.timeZone,
            currencyCode: opts.currencyCode,
            industryCategory: opts.industryCategory,
          });

          spinner.stop();

          const data: ReportData = {
            headers: ['Name', 'Display Name', 'Time Zone', 'Currency Code', 'Industry Category'],
            rows: [
              [
                property.name ?? '',
                property.displayName ?? '',
                property.timeZone ?? '',
                property.currencyCode ?? '',
                property.industryCategory ?? '',
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
    .description('Update a GA4 property')
    .option('--display-name <name>', 'New display name')
    .option('--time-zone <timeZone>', 'New reporting time zone')
    .option('--currency-code <code>', 'New currency code')
    .option('--industry-category <category>', 'New industry category')
    .action(
      async (
        opts: {
          displayName?: string;
          timeZone?: string;
          currencyCode?: string;
          industryCategory?: string;
        },
        command: Command,
      ) => {
        try {
          const globalOpts = resolveGlobalOptions(command);
          const propertyId = validatePropertyId(globalOpts.property);
          const spinner = createSpinner('Updating property...');
          spinner.start();

          const property = await adminApi.updateProperty({
            name: `properties/${propertyId}`,
            displayName: opts.displayName,
            timeZone: opts.timeZone,
            currencyCode: opts.currencyCode,
            industryCategory: opts.industryCategory,
          });

          spinner.stop();

          const data: ReportData = {
            headers: ['Name', 'Display Name', 'Time Zone', 'Currency Code', 'Industry Category'],
            rows: [
              [
                property.name ?? '',
                property.displayName ?? '',
                property.timeZone ?? '',
                property.currencyCode ?? '',
                property.industryCategory ?? '',
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
    .description('Delete a GA4 property')
    .action(async (_opts: Record<string, unknown>, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);
        const spinner = createSpinner('Deleting property...');
        spinner.start();

        await adminApi.deleteProperty(propertyId);

        spinner.stop();

        const data: ReportData = {
          headers: ['Status', 'Property'],
          rows: [['Deleted', propertyId]],
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
