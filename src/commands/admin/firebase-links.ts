import { Command } from 'commander';
import { resolveGlobalOptions, writeOutput, type ReportData } from '../../types/common.js';
import { formatOutput } from '../../formatters/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { handleError } from '../../utils/error-handler.js';
import { validatePropertyId } from '../../validation/validators.js';
import * as adminApi from '../../services/admin-api.service.js';

export function createFirebaseLinksCommand(): Command {
  const cmd = new Command('firebase-links').description('Manage GA4 Firebase links');

  cmd
    .command('list')
    .description('List Firebase links for a property')
    .action(async (_opts: Record<string, unknown>, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);
        const spinner = createSpinner('Fetching Firebase links...');
        spinner.start();

        const links = await adminApi.listFirebaseLinks(propertyId);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Project', 'Create Time'],
          rows: links.map((link) => [
            link.name ?? '',
            link.project ?? '',
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
    .description('Get a Firebase link')
    .requiredOption('--name <resourceName>', 'Firebase link resource name')
    .action(async (opts: { name: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Fetching Firebase link...');
        spinner.start();

        const link = await adminApi.getFirebaseLink(opts.name);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Project', 'Create Time'],
          rows: [
            [
              link.name ?? '',
              link.project ?? '',
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
    .description('Create a Firebase link')
    .requiredOption('--project <projectId>', 'Firebase project ID or resource name')
    .action(async (opts: { project: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);
        const spinner = createSpinner('Creating Firebase link...');
        spinner.start();

        const link = await adminApi.createFirebaseLink({
          parent: `properties/${propertyId}`,
          project: opts.project,
        });

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Project', 'Create Time'],
          rows: [
            [
              link.name ?? '',
              link.project ?? '',
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
    .command('delete')
    .description('Delete a Firebase link')
    .requiredOption('--name <resourceName>', 'Firebase link resource name')
    .action(async (opts: { name: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Deleting Firebase link...');
        spinner.start();

        await adminApi.deleteFirebaseLink(opts.name);

        spinner.stop();

        const data: ReportData = {
          headers: ['Status', 'Firebase Link'],
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
