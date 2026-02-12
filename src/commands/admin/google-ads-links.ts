import { Command } from 'commander';
import { resolveGlobalOptions, writeOutput, type ReportData } from '../../types/common.js';
import { formatOutput } from '../../formatters/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { handleError } from '../../utils/error-handler.js';
import { validatePropertyId } from '../../validation/validators.js';
import * as adminApi from '../../services/admin-api.service.js';

export function createGoogleAdsLinksCommand(): Command {
  const cmd = new Command('google-ads-links').description('Manage GA4 Google Ads links');

  cmd
    .command('list')
    .description('List Google Ads links for a property')
    .action(async (_opts: Record<string, unknown>, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);
        const spinner = createSpinner('Fetching Google Ads links...');
        spinner.start();

        const links = await adminApi.listGoogleAdsLinks(propertyId);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Customer ID', 'Can Manage Clients', 'Ads Personalization Enabled', 'Create Time', 'Update Time'],
          rows: links.map((link) => [
            link.name ?? '',
            link.customerId ?? '',
            String(link.canManageClients ?? ''),
            String(link.adsPersonalizationEnabled ?? ''),
            link.createTime ?? '',
            link.updateTime ?? '',
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
    .description('Get a Google Ads link')
    .requiredOption('--name <resourceName>', 'Google Ads link resource name')
    .action(async (opts: { name: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Fetching Google Ads link...');
        spinner.start();

        const link = await adminApi.getGoogleAdsLink(opts.name);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Customer ID', 'Can Manage Clients', 'Ads Personalization Enabled', 'Create Time', 'Update Time'],
          rows: [
            [
              link.name ?? '',
              link.customerId ?? '',
              String(link.canManageClients ?? ''),
              String(link.adsPersonalizationEnabled ?? ''),
              link.createTime ?? '',
              link.updateTime ?? '',
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
    .description('Create a Google Ads link')
    .requiredOption('--customer-id <customerId>', 'Google Ads customer ID')
    .action(async (opts: { customerId: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);
        const spinner = createSpinner('Creating Google Ads link...');
        spinner.start();

        const link = await adminApi.createGoogleAdsLink({
          parent: `properties/${propertyId}`,
          customerId: opts.customerId,
        });

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Customer ID', 'Ads Personalization Enabled', 'Create Time'],
          rows: [
            [
              link.name ?? '',
              link.customerId ?? '',
              String(link.adsPersonalizationEnabled ?? ''),
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
    .command('update')
    .description('Update a Google Ads link')
    .requiredOption('--name <resourceName>', 'Google Ads link resource name')
    .option('--ads-personalization-enabled <enabled>', 'Enable/disable ads personalization (true/false)')
    .action(
      async (
        opts: {
          name: string;
          adsPersonalizationEnabled?: string;
        },
        command: Command,
      ) => {
        try {
          const globalOpts = resolveGlobalOptions(command);
          const spinner = createSpinner('Updating Google Ads link...');
          spinner.start();

          const link = await adminApi.updateGoogleAdsLink({
            name: opts.name,
            adsPersonalizationEnabled: opts.adsPersonalizationEnabled
              ? opts.adsPersonalizationEnabled === 'true'
              : undefined,
          });

          spinner.stop();

          const data: ReportData = {
            headers: ['Name', 'Customer ID', 'Ads Personalization Enabled', 'Update Time'],
            rows: [
              [
                link.name ?? '',
                link.customerId ?? '',
                String(link.adsPersonalizationEnabled ?? ''),
                link.updateTime ?? '',
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
    .description('Delete a Google Ads link')
    .requiredOption('--name <resourceName>', 'Google Ads link resource name')
    .action(async (opts: { name: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Deleting Google Ads link...');
        spinner.start();

        await adminApi.deleteGoogleAdsLink(opts.name);

        spinner.stop();

        const data: ReportData = {
          headers: ['Status', 'Google Ads Link'],
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
