import type { AnyOperation } from '../core/operation.js';
import { accessBindingOps } from './admin/access-bindings.op.js';
import { accountOps } from './admin/accounts.op.js';
import { audienceOps } from './admin/audiences.op.js';
import { bigQueryLinkOps } from './admin/bigquery-links.op.js';
import { customDimensionOps } from './admin/custom-dimensions.op.js';
import { customMetricOps } from './admin/custom-metrics.op.js';
import { dataStreamOps } from './admin/datastreams.op.js';
import { firebaseLinkOps } from './admin/firebase-links.op.js';
import { googleAdsLinkOps } from './admin/google-ads-links.op.js';
import { keyEventOps } from './admin/key-events.op.js';
import { propertyOps } from './admin/properties.op.js';
import { audienceExportOps } from './audience/export.op.js';
import { recurringAudienceOps } from './audience/recurring.op.js';
import { metadataGet } from './metadata/get.op.js';
import { metadataExtraOps } from './metadata/index.js';
import { reportOps } from './report/index.js';
import { reportRun } from './report/run.op.js';

/** Every GA API operation, in 1.x command order (help and `gacli schema` follow it). */
export const OPERATIONS: AnyOperation[] = [
  reportRun,
  ...reportOps,
  metadataGet,
  ...metadataExtraOps,
  ...audienceExportOps,
  ...recurringAudienceOps,
  ...accountOps,
  ...propertyOps,
  ...dataStreamOps,
  ...customDimensionOps,
  ...customMetricOps,
  ...keyEventOps,
  ...audienceOps,
  ...accessBindingOps,
  ...firebaseLinkOps,
  ...googleAdsLinkOps,
  ...bigQueryLinkOps,
];
