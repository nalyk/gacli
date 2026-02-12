import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { getAuthClientOptions } from './auth.service.js';
import type { ReportData } from '../types/common.js';
import type {
  RunReportParams,
  RunPivotReportParams,
  RunRealtimeReportParams,
  RunFunnelReportParams,
  RunCohortReportParams,
  BatchRunReportsRequest,
  BatchRunPivotReportsRequest,
} from '../types/data-api.js';

let client: BetaAnalyticsDataClient | null = null;

function getClient(): BetaAnalyticsDataClient {
  if (!client) {
    client = new BetaAnalyticsDataClient({ ...getAuthClientOptions() } as any);
  }
  return client;
}

function toReportData(response: any): ReportData {
  const dimensionHeaders = (response.dimensionHeaders || []).map((h: any) => h.name);
  const metricHeaders = (response.metricHeaders || []).map((h: any) => h.name);
  const headers = [...dimensionHeaders, ...metricHeaders];

  const rows = (response.rows || []).map((row: any) => {
    const dimValues = (row.dimensionValues || []).map((v: any) => v.value ?? '');
    const metValues = (row.metricValues || []).map((v: any) => v.value ?? '');
    return [...dimValues, ...metValues];
  });

  return {
    headers,
    rows,
    rowCount: Number(response.rowCount ?? rows.length),
    metadata: response.metadata ? { ...response.metadata } : undefined,
  };
}

export async function runReport(params: RunReportParams): Promise<ReportData> {
  const c = getClient();
  const [response] = await c.runReport(params as any);
  return toReportData(response);
}

export async function batchRunReports(propertyId: string, req: BatchRunReportsRequest): Promise<ReportData[]> {
  const c = getClient();
  const [response] = await c.batchRunReports({
    property: `properties/${propertyId}`,
    requests: req.requests as any,
  });
  return (response.reports || []).map(toReportData);
}

export async function runPivotReport(params: RunPivotReportParams): Promise<ReportData> {
  const c = getClient();
  const [response] = await c.runPivotReport(params as any);
  return toReportData(response);
}

export async function batchRunPivotReports(propertyId: string, req: BatchRunPivotReportsRequest): Promise<ReportData[]> {
  const c = getClient();
  const [response] = await c.batchRunPivotReports({
    property: `properties/${propertyId}`,
    requests: req.requests as any,
  });
  return (response.pivotReports || []).map(toReportData);
}

export async function runRealtimeReport(params: RunRealtimeReportParams): Promise<ReportData> {
  const c = getClient();
  const [response] = await c.runRealtimeReport(params as any);
  return toReportData(response);
}

export async function runFunnelReport(params: RunFunnelReportParams): Promise<ReportData> {
  const c = getClient();
  const [response] = await (c as any).runFunnelReport(params);

  const funnelTable = (response as any).funnelTable;
  if (!funnelTable) {
    return { headers: [], rows: [], rowCount: 0 };
  }

  const headers = [
    ...(funnelTable.subReport?.dimensionHeaders || []).map((h: any) => h.name),
    ...(funnelTable.subReport?.metricHeaders || []).map((h: any) => h.name),
  ];

  const rows = (funnelTable.subReport?.rows || []).map((row: any) => {
    const dimValues = (row.dimensionValues || []).map((v: any) => v.value ?? '');
    const metValues = (row.metricValues || []).map((v: any) => v.value ?? '');
    return [...dimValues, ...metValues];
  });

  return { headers, rows, rowCount: rows.length };
}

export async function runCohortReport(params: RunCohortReportParams): Promise<ReportData> {
  const c = getClient();
  const request: any = {
    property: params.property,
    cohortSpec: params.cohortSpec,
    metrics: params.metrics,
  };
  if (params.dimensions) request.dimensions = params.dimensions;

  const [response] = await c.runReport(request);
  return toReportData(response);
}

export async function getMetadata(propertyId: string): Promise<any> {
  const c = getClient();
  const [response] = await c.getMetadata({
    name: `properties/${propertyId}/metadata`,
  });
  return response;
}

export async function checkCompatibility(
  propertyId: string,
  metrics: string[],
  dimensions: string[],
): Promise<any> {
  const c = getClient();
  const [response] = await (c as any).checkCompatibility({
    property: `properties/${propertyId}`,
    metrics: metrics.map((name) => ({ name })),
    dimensions: dimensions.map((name) => ({ name })),
  });
  return response;
}

export async function createAudienceExport(
  propertyId: string,
  audienceName: string,
  dimensions?: string[],
): Promise<any> {
  const c = getClient();
  const request: any = {
    parent: `properties/${propertyId}`,
    audienceExport: {
      audience: audienceName,
      dimensions: dimensions?.map((name) => ({ dimensionName: name })),
    },
  };
  const [operation] = await (c as any).createAudienceExport(request);
  return operation;
}

export async function getAudienceExport(name: string): Promise<any> {
  const c = getClient();
  const [response] = await (c as any).getAudienceExport({ name });
  return response;
}

export async function listAudienceExports(propertyId: string): Promise<any[]> {
  const c = getClient();
  const [response] = await (c as any).listAudienceExports({
    parent: `properties/${propertyId}`,
  });
  return response.audienceExports || [];
}

export async function queryAudienceExport(name: string, limit?: number, offset?: number): Promise<ReportData> {
  const c = getClient();
  const request: any = { name };
  if (limit !== undefined) request.limit = limit;
  if (offset !== undefined) request.offset = offset;
  const [response] = await (c as any).queryAudienceExport(request);
  return toReportData(response);
}

export async function createRecurringAudienceList(
  propertyId: string,
  audienceName: string,
  dimensions?: string[],
): Promise<any> {
  const c = getClient();
  const request: any = {
    parent: `properties/${propertyId}`,
    recurringAudienceList: {
      audience: audienceName,
      dimensions: dimensions?.map((name) => ({ dimensionName: name })),
    },
  };
  const [response] = await (c as any).createRecurringAudienceList(request);
  return response;
}

export async function getRecurringAudienceList(name: string): Promise<any> {
  const c = getClient();
  const [response] = await (c as any).getRecurringAudienceList({ name });
  return response;
}

export async function listRecurringAudienceLists(propertyId: string): Promise<any[]> {
  const c = getClient();
  const [response] = await (c as any).listRecurringAudienceLists({
    parent: `properties/${propertyId}`,
  });
  return response.recurringAudienceLists || [];
}
