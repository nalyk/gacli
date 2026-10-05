import type { AnyOperation } from '../../core/operation.js';
import { reportBatch } from './batch.op.js';
import { reportBatchPivot } from './batch-pivot.op.js';
import { reportCohort } from './cohort.op.js';
import { reportFunnel } from './funnel.op.js';
import { reportPivot } from './pivot.op.js';
import { reportRealtime } from './realtime.op.js';

/** 1.x order, excluding report.run (registered separately). */
export const reportOps: AnyOperation[] = [
  reportPivot,
  reportBatch,
  reportBatchPivot,
  reportRealtime,
  reportCohort,
  reportFunnel,
];
