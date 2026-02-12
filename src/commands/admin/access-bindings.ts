import { Command } from 'commander';
import { resolveGlobalOptions, writeOutput, type ReportData } from '../../types/common.js';
import { formatOutput } from '../../formatters/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { handleError } from '../../utils/error-handler.js';
import * as adminApi from '../../services/admin-api.service.js';

export function createAccessBindingsCommand(): Command {
  const cmd = new Command('access-bindings').description('Manage GA4 access bindings');

  cmd
    .command('list')
    .description('List access bindings for an account or property')
    .requiredOption('--parent <parent>', 'Account or property resource name (e.g., accounts/123 or properties/456)')
    .action(async (opts: { parent: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Fetching access bindings...');
        spinner.start();

        const bindings = await adminApi.listAccessBindings(opts.parent);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'User', 'Roles'],
          rows: bindings.map((binding) => [
            binding.name ?? '',
            binding.user ?? '',
            Array.isArray(binding.roles) ? binding.roles.join(', ') : (binding.roles ?? ''),
          ]),
          rowCount: bindings.length,
        };

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  cmd
    .command('get')
    .description('Get an access binding')
    .requiredOption('--name <resourceName>', 'Access binding resource name')
    .action(async (opts: { name: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Fetching access binding...');
        spinner.start();

        const binding = await adminApi.getAccessBinding(opts.name);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'User', 'Roles'],
          rows: [
            [
              binding.name ?? '',
              binding.user ?? '',
              Array.isArray(binding.roles) ? binding.roles.join(', ') : (binding.roles ?? ''),
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
    .description('Create an access binding')
    .requiredOption('--parent <parent>', 'Account or property resource name')
    .requiredOption('--user <email>', 'User email address')
    .requiredOption('--roles <roles...>', 'Roles to assign (variadic)')
    .action(
      async (
        opts: {
          parent: string;
          user: string;
          roles: string[];
        },
        command: Command,
      ) => {
        try {
          const globalOpts = resolveGlobalOptions(command);
          const spinner = createSpinner('Creating access binding...');
          spinner.start();

          const binding = await adminApi.createAccessBinding({
            parent: opts.parent,
            user: opts.user,
            roles: opts.roles,
          });

          spinner.stop();

          const data: ReportData = {
            headers: ['Name', 'User', 'Roles'],
            rows: [
              [
                binding.name ?? '',
                binding.user ?? '',
                Array.isArray(binding.roles) ? binding.roles.join(', ') : (binding.roles ?? ''),
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
    .description('Update an access binding')
    .requiredOption('--name <resourceName>', 'Access binding resource name')
    .requiredOption('--roles <roles...>', 'New roles to assign (variadic)')
    .action(
      async (
        opts: {
          name: string;
          roles: string[];
        },
        command: Command,
      ) => {
        try {
          const globalOpts = resolveGlobalOptions(command);
          const spinner = createSpinner('Updating access binding...');
          spinner.start();

          const binding = await adminApi.updateAccessBinding({
            name: opts.name,
            roles: opts.roles,
          });

          spinner.stop();

          const data: ReportData = {
            headers: ['Name', 'User', 'Roles'],
            rows: [
              [
                binding.name ?? '',
                binding.user ?? '',
                Array.isArray(binding.roles) ? binding.roles.join(', ') : (binding.roles ?? ''),
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
    .description('Delete an access binding')
    .requiredOption('--name <resourceName>', 'Access binding resource name')
    .action(async (opts: { name: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Deleting access binding...');
        spinner.start();

        await adminApi.deleteAccessBinding(opts.name);

        spinner.stop();

        const data: ReportData = {
          headers: ['Status', 'Access Binding'],
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
