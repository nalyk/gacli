import { Command } from 'commander';
import { createExportCreateCommand } from './export-create.js';
import { createExportGetCommand } from './export-get.js';
import { createExportListCommand } from './export-list.js';
import { createExportQueryCommand } from './export-query.js';
import { createRecurringCreateCommand } from './recurring-create.js';
import { createRecurringGetCommand } from './recurring-get.js';
import { createRecurringListCommand } from './recurring-list.js';

export function createAudienceCommand(): Command {
  const cmd = new Command('audience').description('Audience export and recurring audience operations');

  const exportCmd = new Command('export').description('Audience export operations');
  exportCmd.addCommand(createExportCreateCommand());
  exportCmd.addCommand(createExportGetCommand());
  exportCmd.addCommand(createExportListCommand());
  exportCmd.addCommand(createExportQueryCommand());
  cmd.addCommand(exportCmd);

  const recurringCmd = new Command('recurring').description('Recurring audience list operations');
  recurringCmd.addCommand(createRecurringCreateCommand());
  recurringCmd.addCommand(createRecurringGetCommand());
  recurringCmd.addCommand(createRecurringListCommand());
  cmd.addCommand(recurringCmd);

  return cmd;
}
