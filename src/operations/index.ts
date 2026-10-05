import type { AnyOperation } from '../core/operation.js';
import { accessBindingOps } from './admin/access-bindings.op.js';
import { accessReportOps } from './admin/access-report.op.js';
import { accountSummaryOps } from './admin/account-summaries.op.js';
import { accountOps } from './admin/accounts.op.js';
import { annotationOps } from './admin/annotations.op.js';
import { audienceOps } from './admin/audiences.op.js';
import { bigQueryLinkOps } from './admin/bigquery-links.op.js';
import { changeHistoryOps } from './admin/change-history.op.js';
import { customDimensionOps } from './admin/custom-dimensions.op.js';
import { customMetricOps } from './admin/custom-metrics.op.js';
import { dataRetentionOps } from './admin/data-retention.op.js';
import { dataStreamOps } from './admin/datastreams.op.js';
import { firebaseLinkOps } from './admin/firebase-links.op.js';
import { googleAdsLinkOps } from './admin/google-ads-links.op.js';
import { keyEventOps } from './admin/key-events.op.js';
import { measurementSecretOps } from './admin/measurement-secrets.op.js';
import { propertyOps } from './admin/properties.op.js';
import { audienceExportOps } from './audience/export.op.js';
import { recurringAudienceOps } from './audience/recurring.op.js';
import { metadataGet } from './metadata/get.op.js';
import { metadataExtraOps } from './metadata/index.js';
import { reportOps } from './report/index.js';
import { reportRun } from './report/run.op.js';

/** Every GA API operation: 1.x command order first, 2.0 additions after (help and `gacli schema` follow it). */
export const OPERATIONS: AnyOperation[] = [
  reportRun,
  ...reportOps,
  metadataGet,
  ...metadataExtraOps,
  ...audienceExportOps,
  ...recurringAudienceOps,
  ...accountOps,
  ...accountSummaryOps,
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
  // 2.0 additions
  ...annotationOps,
  ...changeHistoryOps,
  ...accessReportOps,
  ...measurementSecretOps,
  ...dataRetentionOps,
];
