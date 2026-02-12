import { Command } from 'commander';
import { createRunCommand } from './run.js';
import { createBatchCommand } from './batch.js';
import { createPivotCommand } from './pivot.js';
import { createBatchPivotCommand } from './batch-pivot.js';
import { createRealtimeCommand } from './realtime.js';
import { createFunnelCommand } from './funnel.js';
import { createCohortCommand } from './cohort.js';

export function createReportCommand(): Command {
  const cmd = new Command('report')
    .description('Google Analytics 4 Data API reporting commands');

  cmd.addCommand(createRunCommand());
  cmd.addCommand(createBatchCommand());
  cmd.addCommand(createPivotCommand());
  cmd.addCommand(createBatchPivotCommand());
  cmd.addCommand(createRealtimeCommand());
  cmd.addCommand(createFunnelCommand());
  cmd.addCommand(createCohortCommand());

  return cmd;
}
