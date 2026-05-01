import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Command } from 'commander';
import { z } from 'zod';
import {
  checkCompatibility,
  getMetadata,
  runRealtimeReport,
  runReport,
} from '../../services/data-api.service.js';
import type { ReportData } from '../../types/common.js';
import { resolveGlobalOptions } from '../../types/common.js';
import type { Dimension, Metric, OrderBy, RunReportParams } from '../../types/data-api.js';
import { resolveDate } from '../../utils/date-helpers.js';
import { handleError } from '../../utils/error-handler.js';
import { buildFilterExpression } from '../../utils/filter-builder.js';
import { logger } from '../../utils/logger.js';
import { validatePropertyId } from '../../validation/validators.js';

const VERSION = '1.0.0';

function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function reportToObjects(d: ReportData): Array<Record<string, string>> {
  return d.rows.map((row) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < d.headers.length; i++) {
      obj[d.headers[i]] = row[i] ?? '';
    }
    return obj;
  });
}

function parseOrderBys(orderBy?: string[]): OrderBy[] | undefined {
  if (!orderBy?.length) return undefined;
  return orderBy.map((o) => {
    const [type, name, dir] = o.split(':');
    const desc = dir === 'desc';
    return type === 'metric'
      ? ({ metric: { metricName: name }, desc } satisfies OrderBy)
      : ({ dimension: { dimensionName: name }, desc } satisfies OrderBy);
  });
}

function registerTools(server: McpServer, defaultPropertyId: string): void {
  // -----------------------------------------------------------------------------
  // gacli_report_run — standard report. The workhorse.
  // -----------------------------------------------------------------------------
  server.registerTool(
    'gacli_report_run',
    {
      title: 'Run a standard GA4 report',
      description:
        'Runs a GA4 Data API report. Returns a JSON array where each row is an object keyed by ' +
        'header (dimension or metric API name). Use this for any "show me X by Y" question. ' +
        'Date format: YYYY-MM-DD or relative keywords like "today", "yesterday", "7daysAgo".',
      inputSchema: {
        propertyId: z
          .string()
          .optional()
          .describe('GA4 property ID (numeric). Defaults to the property the gacli is configured for.'),
        metrics: z.array(z.string()).min(1).describe('Metric API names. E.g. ["sessions","activeUsers"].'),
        dimensions: z.array(z.string()).optional().describe('Dimension API names. E.g. ["date","country"].'),
        startDate: z.string().default('7daysAgo'),
        endDate: z.string().default('today'),
        limit: z.number().int().positive().max(100000).optional(),
        offset: z.number().int().nonnegative().optional(),
        orderBy: z
          .array(z.string())
          .optional()
          .describe('Sorts. Format: "metric:NAME:desc" or "dimension:NAME:asc".'),
        dimensionFilter: z
          .array(z.string())
          .optional()
          .describe('Dimension filters in shorthand: field==value, field=~regex, field!=value.'),
        metricFilter: z
          .array(z.string())
          .optional()
          .describe('Metric filters in shorthand: field>100, field<=0.5.'),
      },
    },
    async (args) => {
      const propertyId = validatePropertyId(args.propertyId ?? defaultPropertyId);
      const params: RunReportParams = {
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: resolveDate(args.startDate), endDate: resolveDate(args.endDate) }],
        metrics: args.metrics.map((name) => ({ name })) as Metric[],
        dimensions: args.dimensions?.map((name) => ({ name })) as Dimension[] | undefined,
        dimensionFilter: args.dimensionFilter ? buildFilterExpression(args.dimensionFilter) : undefined,
        metricFilter: args.metricFilter ? buildFilterExpression(args.metricFilter) : undefined,
        orderBys: parseOrderBys(args.orderBy),
        limit: args.limit,
        offset: args.offset,
        keepEmptyRows: false,
      };
      const data = await runReport(params);
      return ok({
        rowCount: data.rowCount,
        rows: reportToObjects(data),
      });
    },
  );

  // -----------------------------------------------------------------------------
  // gacli_report_realtime — last 30 minutes
  // -----------------------------------------------------------------------------
  server.registerTool(
    'gacli_report_realtime',
    {
      title: 'Run a GA4 realtime report',
      description: 'Returns realtime data from the last 30 minutes. Use for "what is happening RIGHT NOW".',
      inputSchema: {
        propertyId: z.string().optional(),
        metrics: z.array(z.string()).min(1),
        dimensions: z.array(z.string()).optional(),
        limit: z.number().int().positive().max(10000).optional(),
      },
    },
    async (args) => {
      const propertyId = validatePropertyId(args.propertyId ?? defaultPropertyId);
      const data = await runRealtimeReport({
        property: `properties/${propertyId}`,
        metrics: args.metrics.map((name) => ({ name })),
        dimensions: args.dimensions?.map((name) => ({ name })),
        limit: args.limit,
      });
      return ok({ rowCount: data.rowCount, rows: reportToObjects(data) });
    },
  );

  // -----------------------------------------------------------------------------
  // gacli_metadata — list dimensions/metrics for a property
  // -----------------------------------------------------------------------------
  server.registerTool(
    'gacli_metadata',
    {
      title: 'Get GA4 property metadata (dimensions and metrics)',
      description:
        'Returns the catalog of available dimensions and metrics for the property, including ' +
        'custom definitions. Use this BEFORE running a report when you are uncertain about ' +
        'API names. Filter results with `kind` and `search`.',
      inputSchema: {
        propertyId: z.string().optional(),
        kind: z.enum(['all', 'dimensions', 'metrics']).default('all'),
        search: z
          .string()
          .optional()
          .describe('Filter by substring against apiName/uiName/description (case-insensitive).'),
        customOnly: z.boolean().default(false),
      },
    },
    async (args) => {
      const propertyId = validatePropertyId(args.propertyId ?? defaultPropertyId);
      const meta = await getMetadata(propertyId);
      type Meta = {
        apiName?: string | null;
        uiName?: string | null;
        description?: string | null;
        category?: string | null;
        customDefinition?: boolean | null;
      };
      const dims: Meta[] = (meta.dimensions ?? []) as Meta[];
      const mets: Meta[] = (meta.metrics ?? []) as Meta[];
      const term = args.search?.toLowerCase();
      const matches = (m: Meta) =>
        !term ||
        (m.apiName ?? '').toLowerCase().includes(term) ||
        (m.uiName ?? '').toLowerCase().includes(term) ||
        (m.description ?? '').toLowerCase().includes(term);
      const customFilter = (m: Meta) => !args.customOnly || !!m.customDefinition;

      const filteredDims = args.kind === 'metrics' ? [] : dims.filter(matches).filter(customFilter);
      const filteredMets = args.kind === 'dimensions' ? [] : mets.filter(matches).filter(customFilter);

      return ok({
        dimensionCount: filteredDims.length,
        metricCount: filteredMets.length,
        dimensions: filteredDims.map((d) => ({
          apiName: d.apiName ?? '',
          uiName: d.uiName ?? '',
          description: d.description ?? '',
          category: d.category ?? '',
          custom: !!d.customDefinition,
        })),
        metrics: filteredMets.map((m) => ({
          apiName: m.apiName ?? '',
          uiName: m.uiName ?? '',
          description: m.description ?? '',
          category: m.category ?? '',
          custom: !!m.customDefinition,
        })),
      });
    },
  );

  // -----------------------------------------------------------------------------
  // gacli_check_compatibility — verify dim+metric combination is queryable
  // -----------------------------------------------------------------------------
  server.registerTool(
    'gacli_check_compatibility',
    {
      title: 'Check GA4 dimension/metric compatibility',
      description:
        'Verifies that a set of dimensions and metrics can be queried together. Useful before ' +
        'running a report that might fail due to incompatible field combinations.',
      inputSchema: {
        propertyId: z.string().optional(),
        metrics: z.array(z.string()).default([]),
        dimensions: z.array(z.string()).default([]),
      },
    },
    async (args) => {
      const propertyId = validatePropertyId(args.propertyId ?? defaultPropertyId);
      const resp = await checkCompatibility(propertyId, args.metrics, args.dimensions);
      return ok({
        dimensionCompatibilities: resp.dimensionCompatibilities ?? [],
        metricCompatibilities: resp.metricCompatibilities ?? [],
      });
    },
  );
}

export function createMcpCommand(): Command {
  const cmd = new Command('mcp').description('Model Context Protocol server (stdio)');

  cmd
    .command('serve')
    .description(
      'Start an MCP server over stdio. Connect from Claude Desktop, Cursor, Cline, etc. ' +
        'Tools: gacli_report_run, gacli_report_realtime, gacli_metadata, gacli_check_compatibility.',
    )
    .action(async (_opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        // The MCP transport speaks JSON-RPC on stdout; gacli's normal logging goes to stderr already
        // but we go silent on the spinner-style messages to avoid any stdout contamination risk.
        logger.setVerbose(false);

        const server = new McpServer({ name: 'gacli', version: VERSION });
        registerTools(server, globalOpts.property ?? '');

        const transport = new StdioServerTransport();
        await server.connect(transport);
        // Keep the process alive — McpServer.connect resolves once handshake is done; the
        // transport keeps stdin open until the client closes it, which terminates the process.
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}
