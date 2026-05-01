import { Command } from 'commander';
import { createBatchCommand } from './batch.js';
import { createBatchPivotCommand } from './batch-pivot.js';
import { createCohortCommand } from './cohort.js';
import { createFunnelCommand } from './funnel.js';
import { createPivotCommand } from './pivot.js';
import { createRealtimeCommand } from './realtime.js';
import { createRunCommand } from './run.js';

export function createReportCommand(): Command {
  const cmd = new Command('report').description('Google Analytics 4 Data API reporting commands');

  cmd.addCommand(createRunCommand());
  cmd.addCommand(createBatchCommand());
  cmd.addCommand(createPivotCommand());
  cmd.addCommand(createBatchPivotCommand());
  cmd.addCommand(createRealtimeCommand());
  cmd.addCommand(createFunnelCommand());
  cmd.addCommand(createCohortCommand());

  return cmd;
}
