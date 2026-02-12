import { Command } from 'commander';
import { resolveGlobalOptions, writeOutput, type ReportData } from '../../types/common.js';
import { formatOutput } from '../../formatters/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { handleError } from '../../utils/error-handler.js';
import { validatePropertyId } from '../../validation/validators.js';
import * as adminApi from '../../services/admin-api.service.js';

export function createAudiencesCommand(): Command {
  const cmd = new Command('audiences').description('Manage GA4 audiences');

  cmd
    .command('list')
    .description('List audiences for a property')
    .action(async (_opts: Record<string, unknown>, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);
        const spinner = createSpinner('Fetching audiences...');
        spinner.start();

        const audiences = await adminApi.listAudiences(propertyId);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Display Name', 'Description', 'Membership Duration Days'],
          rows: audiences.map((audience) => [
            audience.name ?? '',
            audience.displayName ?? '',
            audience.description ?? '',
            String(audience.membershipDurationDays ?? ''),
          ]),
          rowCount: audiences.length,
        };

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  cmd
    .command('get')
    .description('Get an audience')
    .requiredOption('--name <resourceName>', 'Audience resource name')
    .action(async (opts: { name: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Fetching audience...');
        spinner.start();

        const audience = await adminApi.getAudience(opts.name);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Display Name', 'Description', 'Membership Duration Days'],
          rows: [
            [
              audience.name ?? '',
              audience.displayName ?? '',
              audience.description ?? '',
              String(audience.membershipDurationDays ?? ''),
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
    .description('Create an audience')
    .requiredOption('--display-name <displayName>', 'Display name')
    .option('--description <description>', 'Description of the audience')
    .option('--membership-duration-days <days>', 'Membership duration in days')
    .option('--filter-clauses <json>', 'Filter clauses as JSON string')
    .action(
      async (
        opts: {
          displayName: string;
          description?: string;
          membershipDurationDays?: string;
          filterClauses?: string;
        },
        command: Command,
      ) => {
        try {
          const globalOpts = resolveGlobalOptions(command);
          const propertyId = validatePropertyId(globalOpts.property);
          const spinner = createSpinner('Creating audience...');
          spinner.start();

          const filterClauses = opts.filterClauses ? JSON.parse(opts.filterClauses) : undefined;

          const audience = await adminApi.createAudience({
            parent: `properties/${propertyId}`,
            displayName: opts.displayName,
            description: opts.description,
            membershipDurationDays: opts.membershipDurationDays
              ? parseInt(opts.membershipDurationDays, 10)
              : 30,
            filterClauses: filterClauses || [],
          });

          spinner.stop();

          const data: ReportData = {
            headers: ['Name', 'Display Name', 'Description', 'Membership Duration Days'],
            rows: [
              [
                audience.name ?? '',
                audience.displayName ?? '',
                audience.description ?? '',
                String(audience.membershipDurationDays ?? ''),
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
    .description('Update an audience')
    .requiredOption('--name <resourceName>', 'Audience resource name')
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
          const spinner = createSpinner('Updating audience...');
          spinner.start();

          const audience = await adminApi.updateAudience({
            name: opts.name,
            displayName: opts.displayName,
            description: opts.description,
          });

          spinner.stop();

          const data: ReportData = {
            headers: ['Name', 'Display Name', 'Description', 'Membership Duration Days'],
            rows: [
              [
                audience.name ?? '',
                audience.displayName ?? '',
                audience.description ?? '',
                String(audience.membershipDurationDays ?? ''),
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
    .description('Archive an audience')
    .requiredOption('--name <resourceName>', 'Audience resource name')
    .action(async (opts: { name: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Archiving audience...');
        spinner.start();

        await adminApi.archiveAudience(opts.name);

        spinner.stop();

        const data: ReportData = {
          headers: ['Status', 'Audience'],
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
