import type { AnyOperation } from '../core/operation.js';
import { customDimensionOps } from './admin/custom-dimensions.op.js';
import { metadataGet } from './metadata/get.op.js';
import { reportRun } from './report/run.op.js';

export const OPERATIONS: AnyOperation[] = [reportRun, metadataGet, ...customDimensionOps];
