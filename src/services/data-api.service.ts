import type { BetaAnalyticsDataClient, protos, v1alpha } from '@google-analytics/data';
import type { ReportData } from '../types/common.js';
import type {
  BatchRunPivotReportsRequest,
  BatchRunReportsRequest,
  ReportTaskInput,
  RunCohortReportParams,
  RunFunnelReportParams,
  RunPivotReportParams,
  RunRealtimeReportParams,
  RunReportAlphaParams,
  RunReportParams,
} from '../types/data-api.js';
import { withRetry } from '../utils/retry.js';
import { ensureCredentials, getAuthClientOptions } from './auth.service.js';

// Path aliases — protos namespace is deeply nested; alias for readability at use sites.
type IRunReportRequest = protos.google.analytics.data.v1beta.IRunReportRequest;
type IRunReportResponse = protos.google.analytics.data.v1beta.IRunReportResponse;
type IRunPivotReportRequest = protos.google.analytics.data.v1beta.IRunPivotReportRequest;
type IRunPivotReportResponse = protos.google.analytics.data.v1beta.IRunPivotReportResponse;
type IRunRealtimeReportRequest = protos.google.analytics.data.v1beta.IRunRealtimeReportRequest;
type IRunRealtimeReportResponse = protos.google.analytics.data.v1beta.IRunRealtimeReportResponse;
type IBatchRunReportsResponse = protos.google.analytics.data.v1beta.IBatchRunReportsResponse;
type IBatchRunPivotReportsResponse = protos.google.analytics.data.v1beta.IBatchRunPivotReportsResponse;
type ICheckCompatibilityResponse = protos.google.analytics.data.v1beta.ICheckCompatibilityResponse;
type IMetadata = protos.google.analytics.data.v1beta.IMetadata;
type IAudienceExport = protos.google.analytics.data.v1beta.IAudienceExport;
type IRecurringAudienceList = protos.google.analytics.data.v1alpha.IRecurringAudienceList;
type IRunFunnelReportRequest = protos.google.analytics.data.v1alpha.IRunFunnelReportRequest;
type IRunFunnelReportResponse = protos.google.analytics.data.v1alpha.IRunFunnelReportResponse;
type IAlphaRunReportRequest = protos.google.analytics.data.v1alpha.IRunReportRequest;
type IPropertyQuotasSnapshot = protos.google.analytics.data.v1alpha.IPropertyQuotasSnapshot;
type IReportTask = protos.google.analytics.data.v1alpha.IReportTask;
type IChatRequest = protos.google.analytics.data.v1alpha.IChatRequest;
type IChatResponse = protos.google.analytics.data.v1alpha.IChatResponse;

type ReportLike = {
  dimensionHeaders?: { name?: string | null }[] | null;
  metricHeaders?: { name?: string | null }[] | null;
  rows?:
    | {
        dimensionValues?: { value?: string | null }[] | null;
        metricValues?: { value?: string | null }[] | null;
      }[]
    | null;
  rowCount?: number | null;
  metadata?: unknown;
  propertyQuota?: unknown;
};

// SDK ClientOptions narrowed in @google-analytics/data 5.x: `auth` is now typed as
// GoogleAuth<AuthClient>, not GoogleAuth<JSONClient>, and OAuth2Client is excluded
// from the JSONClient union. At runtime the SDK accepts both shapes — this is a
// well-known upstream type-narrowness gap. Cast through unknown at the boundary.
type ClientCtor = ConstructorParameters<typeof BetaAnalyticsDataClient>[0];
type AlphaClientCtor = ConstructorParameters<typeof v1alpha.AlphaAnalyticsDataClient>[0];

let betaClient: BetaAnalyticsDataClient | null = null;
let alphaClient: v1alpha.AlphaAnalyticsDataClient | null = null;

// SDKs are imported on first use so `--help`, `config`, `auth` etc. never pay the gRPC load cost.
async function getClient(): Promise<BetaAnalyticsDataClient> {
  if (!betaClient) {
    await ensureCredentials();
    const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
    betaClient = new BetaAnalyticsDataClient(getAuthClientOptions() as unknown as ClientCtor);
  }
  return betaClient;
}

async function getAlphaClient(): Promise<v1alpha.AlphaAnalyticsDataClient> {
  if (!alphaClient) {
    await ensureCredentials();
    const { v1alpha } = await import('@google-analytics/data');
    alphaClient = new v1alpha.AlphaAnalyticsDataClient(getAuthClientOptions() as unknown as AlphaClientCtor);
  }
  return alphaClient;
}

export function toReportData(response: ReportLike): ReportData {
  const dimensionHeaders = (response.dimensionHeaders ?? []).map((h) => h.name ?? '');
  const metricHeaders = (response.metricHeaders ?? []).map((h) => h.name ?? '');
  const headers = [...dimensionHeaders, ...metricHeaders];

  const rows = (response.rows ?? []).map((row) => {
    const dimValues = (row.dimensionValues ?? []).map((v) => v.value ?? '');
    const metValues = (row.metricValues ?? []).map((v) => v.value ?? '');
    return [...dimValues, ...metValues];
  });

  const metadata: Record<string, unknown> =
    response.metadata && typeof response.metadata === 'object'
      ? { ...(response.metadata as Record<string, unknown>) }
      : {};
  // Repeated proto fields decode as [] — only keep truncation reasons that say something.
  if (Array.isArray(metadata.dataTruncationReasons) && metadata.dataTruncationReasons.length === 0) {
    delete metadata.dataTruncationReasons;
  }
  if (response.propertyQuota && typeof response.propertyQuota === 'object') {
    metadata.propertyQuota = response.propertyQuota;
  }

  return {
    headers,
    rows,
    rowCount: Number(response.rowCount ?? rows.length),
    metadata: Object.keys(metadata).length ? metadata : undefined,
  };
}

// Local CLI-side option types are intentionally loose (e.g. orderType: string).
// Cast at the SDK boundary — single line per call, isolates drift to one site.

export async function runReport(params: RunReportParams): Promise<ReportData> {
  const [response] = await withRetry(async () => (await getClient()).runReport(params as IRunReportRequest), {
    label: 'runReport',
  });
  return toReportData(response as IRunReportResponse);
}

export async function batchRunReports(
  propertyId: string,
  req: BatchRunReportsRequest,
): Promise<ReportData[]> {
  const [response] = await withRetry(
    async () =>
      (await getClient()).batchRunReports({
        property: `properties/${propertyId}`,
        requests: req.requests as IRunReportRequest[],
      }),
    { label: 'batchRunReports' },
  );
  const reports = (response as IBatchRunReportsResponse).reports ?? [];
  return reports.map((r) => toReportData(r as ReportLike));
}

export async function runPivotReport(params: RunPivotReportParams): Promise<ReportData> {
  const [response] = await withRetry(
    async () => (await getClient()).runPivotReport(params as IRunPivotReportRequest),
    {
      label: 'runPivotReport',
    },
  );
  return toReportData(response as IRunPivotReportResponse);
}

export async function batchRunPivotReports(
  propertyId: string,
  req: BatchRunPivotReportsRequest,
): Promise<ReportData[]> {
  const [response] = await withRetry(
    async () =>
      (await getClient()).batchRunPivotReports({
        property: `properties/${propertyId}`,
        requests: req.requests as IRunPivotReportRequest[],
      }),
    { label: 'batchRunPivotReports' },
  );
  const pivotReports = (response as IBatchRunPivotReportsResponse).pivotReports ?? [];
  return pivotReports.map((r) => toReportData(r as ReportLike));
}

export async function runRealtimeReport(params: RunRealtimeReportParams): Promise<ReportData> {
  const [response] = await withRetry(
    async () => (await getClient()).runRealtimeReport(params as IRunRealtimeReportRequest),
    { label: 'runRealtimeReport' },
  );
  return toReportData(response as IRunRealtimeReportResponse);
}

export async function runFunnelReport(params: RunFunnelReportParams): Promise<ReportData> {
  const [response] = await withRetry(
    async () => (await getAlphaClient()).runFunnelReport(params as IRunFunnelReportRequest),
    { label: 'runFunnelReport' },
  );
  const funnelTable = (response as IRunFunnelReportResponse).funnelTable;
  if (!funnelTable) {
    return { headers: [], rows: [], rowCount: 0 };
  }
  return toReportData(funnelTable as ReportLike);
}

export async function runCohortReport(params: RunCohortReportParams): Promise<ReportData> {
  const [response] = await withRetry(
    async () =>
      (await getClient()).runReport({
        property: params.property,
        cohortSpec: params.cohortSpec,
        metrics: params.metrics,
        dimensions: params.dimensions,
      } as IRunReportRequest),
    { label: 'runCohortReport' },
  );
  return toReportData(response as IRunReportResponse);
}

export async function getMetadata(propertyId: string): Promise<IMetadata> {
  const [response] = await withRetry(
    async () => (await getClient()).getMetadata({ name: `properties/${propertyId}/metadata` }),
    { label: 'getMetadata' },
  );
  return response as IMetadata;
}

export async function checkCompatibility(
  propertyId: string,
  metrics: string[],
  dimensions: string[],
): Promise<ICheckCompatibilityResponse> {
  const [response] = await withRetry(
    async () =>
      (await getClient()).checkCompatibility({
        property: `properties/${propertyId}`,
        metrics: metrics.map((name) => ({ name })),
        dimensions: dimensions.map((name) => ({ name })),
      }),
    { label: 'checkCompatibility' },
  );
  return response as ICheckCompatibilityResponse;
}

export interface AudienceExportOperation {
  name?: string | null;
  done?: boolean | null;
  metadata?: protos.google.analytics.data.v1beta.IAudienceExportMetadata | null;
  // The SDK's Operation also exposes promise(), getOperation(), etc. — we keep them via the cast.
  promise?: () => Promise<[IAudienceExport, unknown, unknown]>;
}

export async function createAudienceExport(
  propertyId: string,
  audienceName: string,
  dimensions?: string[],
): Promise<AudienceExportOperation> {
  const [operation] = await (await getClient()).createAudienceExport({
    parent: `properties/${propertyId}`,
    audienceExport: {
      audience: audienceName,
      dimensions: dimensions?.map((name) => ({ dimensionName: name })),
    },
  });
  return operation as unknown as AudienceExportOperation;
}

export async function getAudienceExport(name: string): Promise<IAudienceExport> {
  const [response] = await (await getClient()).getAudienceExport({ name });
  return response as IAudienceExport;
}

export async function listAudienceExports(propertyId: string): Promise<IAudienceExport[]> {
  const [response] = await (await getClient()).listAudienceExports({
    parent: `properties/${propertyId}`,
  });
  return response ?? [];
}

export async function queryAudienceExport(
  name: string,
  limit?: number,
  offset?: number,
): Promise<ReportData> {
  const [response] = await (await getClient()).queryAudienceExport({
    name,
    ...(limit !== undefined && { limit }),
    ...(offset !== undefined && { offset }),
  });
  return toReportData(response as ReportLike);
}

export async function createRecurringAudienceList(
  propertyId: string,
  audienceName: string,
  dimensions?: string[],
): Promise<IRecurringAudienceList> {
  const [response] = await (await getAlphaClient()).createRecurringAudienceList({
    parent: `properties/${propertyId}`,
    recurringAudienceList: {
      audience: audienceName,
      dimensions: dimensions?.map((name) => ({ dimensionName: name })),
    },
  });
  return response as IRecurringAudienceList;
}

export async function getRecurringAudienceList(name: string): Promise<IRecurringAudienceList> {
  const [response] = await (await getAlphaClient()).getRecurringAudienceList({ name });
  return response as IRecurringAudienceList;
}

export async function listRecurringAudienceLists(propertyId: string): Promise<IRecurringAudienceList[]> {
  const [response] = await (await getAlphaClient()).listRecurringAudienceLists({
    parent: `properties/${propertyId}`,
  });
  return response ?? [];
}

export async function runReportAlpha(params: RunReportAlphaParams): Promise<ReportData> {
  const [response] = await withRetry(
    async () => (await getAlphaClient()).runReport(params as IAlphaRunReportRequest),
    { label: 'runReportAlpha' },
  );
  return toReportData(response as ReportLike);
}

export async function getPropertyQuotasSnapshot(propertyId: string): Promise<IPropertyQuotasSnapshot> {
  const [response] = await withRetry(
    async () =>
      (await getAlphaClient()).getPropertyQuotasSnapshot({
        name: `properties/${propertyId}/propertyQuotasSnapshot`,
      }),
    { label: 'getPropertyQuotasSnapshot' },
  );
  return response as IPropertyQuotasSnapshot;
}

export interface ReportTaskOperation {
  name?: string | null;
  done?: boolean | null;
  promise?: () => Promise<[IReportTask, unknown, unknown]>;
}

export async function createReportTask(
  propertyId: string,
  reportTask: ReportTaskInput,
): Promise<ReportTaskOperation> {
  const [operation] = await (await getAlphaClient()).createReportTask({
    parent: `properties/${propertyId}`,
    reportTask: reportTask as IReportTask,
  });
  return operation as unknown as ReportTaskOperation;
}

export async function getReportTask(name: string): Promise<IReportTask> {
  const [response] = await withRetry(async () => (await getAlphaClient()).getReportTask({ name }), {
    label: 'getReportTask',
  });
  return response as IReportTask;
}

export async function listReportTasks(propertyId: string): Promise<IReportTask[]> {
  const [response] = await withRetry(
    async () => (await getAlphaClient()).listReportTasks({ parent: `properties/${propertyId}` }),
    { label: 'listReportTasks' },
  );
  return response ?? [];
}

export async function queryReportTask(name: string, limit?: number, offset?: number): Promise<ReportData> {
  const [response] = await withRetry(
    async () =>
      (await getAlphaClient()).queryReportTask({
        name,
        ...(limit !== undefined && { limit }),
        ...(offset !== undefined && { offset }),
      }),
    { label: 'queryReportTask' },
  );
  return toReportData(response as ReportLike);
}

// Not retried: a replayed turn could land twice in the conversation session.
export async function chat(request: IChatRequest): Promise<IChatResponse> {
  const [response] = await (await getAlphaClient()).chat(request);
  return response as IChatResponse;
}
