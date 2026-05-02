import { z } from 'zod';

export const dateRangeSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  name: z.string().optional(),
});

export const dimensionSchema = z.object({
  name: z.string().min(1),
});

export const metricSchema = z.object({
  name: z.string().min(1),
});

export const orderBySchema = z.object({
  dimension: z.object({ dimensionName: z.string(), orderType: z.string().optional() }).optional(),
  metric: z.object({ metricName: z.string() }).optional(),
  desc: z.boolean().optional(),
});

export const minuteRangeSchema = z.object({
  name: z.string().optional(),
  startMinutesAgo: z.number().int().min(0).max(29),
  endMinutesAgo: z.number().int().min(0).max(29),
});

export const funnelStepSchema = z.object({
  name: z.string().min(1),
  isDirectlyFollowedBy: z.boolean().optional(),
  filterExpression: z.any().optional(),
  withinDurationFromPriorStep: z.string().optional(),
});

export const cohortSpecSchema = z.object({
  name: z.string().min(1),
  dimension: z.string().min(1),
  dateRange: dateRangeSchema,
});

export const pivotSchema = z.object({
  fieldNames: z.array(z.string()).min(1),
  orderBys: z.array(orderBySchema).optional(),
  offset: z.number().int().min(0).optional(),
  limit: z.number().int().min(1),
  metricAggregations: z.array(z.enum(['TOTAL', 'MINIMUM', 'MAXIMUM', 'COUNT'])).optional(),
});

export const propertyIdSchema = z.string().regex(/^\d+$/, 'Property ID must be numeric');

export const outputFormatSchema = z.enum(['table', 'json', 'csv', 'chart']);

export const runReportOptsSchema = z.object({
  metrics: z.array(z.string()).min(1, 'At least one metric is required'),
  dimensions: z.array(z.string()).optional(),
  startDate: z.string().default('7daysAgo'),
  endDate: z.string().default('today'),
  limit: z.number().int().min(1).max(100000).optional(),
  offset: z.number().int().min(0).optional(),
  orderBy: z.array(z.string()).optional(),
  dimensionFilter: z.array(z.string()).optional(),
  metricFilter: z.array(z.string()).optional(),
  keepEmptyRows: z.boolean().optional(),
});

export const realtimeReportOptsSchema = z.object({
  metrics: z.array(z.string()).min(1),
  dimensions: z.array(z.string()).optional(),
  minuteRanges: z.string().optional(),
  dimensionFilter: z.array(z.string()).optional(),
  metricFilter: z.array(z.string()).optional(),
  limit: z.number().int().min(1).optional(),
});

export const funnelReportOptsSchema = z.object({
  steps: z.string().min(1, 'Funnel steps JSON is required'),
  openFunnel: z.boolean().optional(),
  funnelBreakdown: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const cohortReportOptsSchema = z.object({
  metrics: z.array(z.string()).min(1),
  cohorts: z.string().min(1, 'Cohort spec JSON is required'),
  cohortGranularity: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('DAILY'),
  endOffset: z.number().int().min(0).default(5),
  startOffset: z.number().int().min(0).optional(),
  dimensions: z.array(z.string()).optional(),
  accumulate: z.boolean().optional(),
});

const agentNameSchema = z.enum(['claude', 'codex', 'qwen', 'gemini', 'all']);

const skillNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'Skill name must be lowercase letters, numbers, and hyphens');

export const skillsInstallOptsSchema = z.object({
  agent: agentNameSchema.optional(),
  scope: z.string().min(1).default('user'),
  name: skillNameSchema.default('gacli'),
  dryRun: z.boolean().optional(),
  force: z.boolean().optional(),
  noDetect: z.boolean().optional(),
});

export const skillsUninstallOptsSchema = z.object({
  agent: agentNameSchema.optional(),
  scope: z.string().min(1).default('user'),
  name: skillNameSchema.default('gacli'),
  dryRun: z.boolean().optional(),
  all: z.boolean().optional(),
});

export const skillsListOptsSchema = z.object({});

export const skillsPathOptsSchema = z.object({
  agent: z.enum(['claude', 'codex', 'qwen', 'gemini']),
  scope: z.string().min(1).default('user'),
});

export const skillsDoctorOptsSchema = z.object({});
