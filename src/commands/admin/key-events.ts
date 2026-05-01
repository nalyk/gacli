import { Command } from 'commander';
import { formatOutput } from '../../formatters/index.js';
import * as adminApi from '../../services/admin-api.service.js';
import { type ReportData, resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';
import { createSpinner } from '../../utils/spinner.js';
import { validatePropertyId } from '../../validation/validators.js';

export function createKeyEventsCommand(): Command {
  const cmd = new Command('key-events').description('Manage GA4 key events');

  cmd
    .command('list')
    .description('List key events for a property')
    .action(async (_opts: Record<string, unknown>, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);
        const spinner = createSpinner('Fetching key events...');
        spinner.start();

        const keyEvents = await adminApi.listKeyEvents(propertyId);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Event Name', 'Counting Method', 'Create Time', 'Custom', 'Deletable'],
          rows: keyEvents.map((event) => [
            event.name ?? '',
            event.eventName ?? '',
            event.countingMethod ?? '',
            event.createTime ?? '',
            String(event.custom ?? ''),
            String(event.deletable ?? ''),
          ]),
          rowCount: keyEvents.length,
        };

        const output = formatOutput(data, globalOpts.format);
        writeOutput(output, globalOpts);
      } catch (error) {
        handleError(error);
      }
    });

  cmd
    .command('get')
    .description('Get a key event')
    .requiredOption('--name <resourceName>', 'Key event resource name')
    .action(async (opts: { name: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Fetching key event...');
        spinner.start();

        const event = await adminApi.getKeyEvent(opts.name);

        spinner.stop();

        const data: ReportData = {
          headers: ['Name', 'Event Name', 'Counting Method', 'Create Time', 'Custom', 'Deletable'],
          rows: [
            [
              event.name ?? '',
              event.eventName ?? '',
              event.countingMethod ?? '',
              event.createTime ?? '',
              String(event.custom ?? ''),
              String(event.deletable ?? ''),
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
    .description('Create a key event')
    .requiredOption('--event-name <eventName>', 'Event name')
    .option(
      '--counting-method <method>',
      'Counting method (ONCE_PER_EVENT, ONCE_PER_SESSION)',
      'ONCE_PER_EVENT',
    )
    .option('--default-value <value>', 'Default value for the key event')
    .option('--currency-code <code>', 'Currency code for the default value')
    .action(
      async (
        opts: {
          eventName: string;
          countingMethod: string;
          defaultValue?: string;
          currencyCode?: string;
        },
        command: Command,
      ) => {
        try {
          const globalOpts = resolveGlobalOptions(command);
          const propertyId = validatePropertyId(globalOpts.property);
          const spinner = createSpinner('Creating key event...');
          spinner.start();

          const event = await adminApi.createKeyEvent({
            parent: `properties/${propertyId}`,
            eventName: opts.eventName,
            countingMethod: opts.countingMethod as 'ONCE_PER_EVENT' | 'ONCE_PER_SESSION',
            defaultValue: opts.defaultValue
              ? {
                  numericValue: parseFloat(opts.defaultValue),
                  currencyCode: opts.currencyCode,
                }
              : undefined,
          });

          spinner.stop();

          const data: ReportData = {
            headers: ['Name', 'Event Name', 'Counting Method', 'Create Time'],
            rows: [
              [event.name ?? '', event.eventName ?? '', event.countingMethod ?? '', event.createTime ?? ''],
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
    .description('Update a key event')
    .requiredOption('--name <resourceName>', 'Key event resource name')
    .option('--counting-method <method>', 'Counting method (ONCE_PER_EVENT, ONCE_PER_SESSION)')
    .option('--default-value <value>', 'Default value for the key event')
    .option('--currency-code <code>', 'Currency code for the default value')
    .action(
      async (
        opts: {
          name: string;
          countingMethod?: string;
          defaultValue?: string;
          currencyCode?: string;
        },
        command: Command,
      ) => {
        try {
          const globalOpts = resolveGlobalOptions(command);
          const spinner = createSpinner('Updating key event...');
          spinner.start();

          const event = await adminApi.updateKeyEvent({
            name: opts.name,
            countingMethod: opts.countingMethod as 'ONCE_PER_EVENT' | 'ONCE_PER_SESSION' | undefined,
            defaultValue: opts.defaultValue
              ? {
                  numericValue: parseFloat(opts.defaultValue),
                  currencyCode: opts.currencyCode,
                }
              : undefined,
          });

          spinner.stop();

          const data: ReportData = {
            headers: ['Name', 'Event Name', 'Counting Method'],
            rows: [[event.name ?? '', event.eventName ?? '', event.countingMethod ?? '']],
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
    .description('Delete a key event')
    .requiredOption('--name <resourceName>', 'Key event resource name')
    .action(async (opts: { name: string }, command: Command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const spinner = createSpinner('Deleting key event...');
        spinner.start();

        await adminApi.deleteKeyEvent(opts.name);

        spinner.stop();

        const data: ReportData = {
          headers: ['Status', 'Key Event'],
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
