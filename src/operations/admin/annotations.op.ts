import type { protos } from '@google-analytics/admin';
import { z } from 'zod';
import { defineOperation } from '../../core/operation.js';
import { getAdminClient } from '../../services/admin-api.service.js';
import { resourceName } from '../shared.js';
import { adminApi, listOp, parentOf, removeOp, updateMask } from './_helpers.js';

type IReportingDataAnnotation = protos.google.analytics.admin.v1alpha.IReportingDataAnnotation;
type IDate = protos.google.type.IDate;

const COLORS = ['PURPLE', 'BROWN', 'BLUE', 'GREEN', 'RED', 'CYAN', 'ORANGE'] as const;

const protoDate = z.looseObject({
  year: z.number().nullish(),
  month: z.number().nullish(),
  day: z.number().nullish(),
});

const annotation = z.looseObject({
  name: z.string(),
  title: z.string().nullish(),
  description: z.string().nullish(),
  color: z.union([z.string(), z.number()]).nullish(),
  annotationDate: protoDate.nullish(),
  annotationDateRange: z
    .looseObject({ startDate: protoDate.nullish(), endDate: protoDate.nullish() })
    .nullish(),
  systemGenerated: z.boolean().nullish(),
});

const pad = (n: number | null | undefined, w: number) => String(n ?? 0).padStart(w, '0');
const fmtDate = (v: unknown) => {
  const d = v as z.infer<typeof protoDate> | null | undefined;
  return d?.year ? `${pad(d.year, 4)}-${pad(d.month, 2)}-${pad(d.day, 2)}` : '';
};

const columns = [
  { header: 'Name', path: 'name' },
  { header: 'Title', path: 'title' },
  { header: 'Color', path: 'color' },
  { header: 'Date', path: 'annotationDate', format: fmtDate },
  { header: 'Start Date', path: 'annotationDateRange.startDate', format: fmtDate },
  { header: 'End Date', path: 'annotationDateRange.endDate', format: fmtDate },
  { header: 'Description', path: 'description' },
];

// YYYY-MM-DD → google.type.Date; impossible calendar dates (2026-02-30) are rejected.
const dateArg = () =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')
    .transform((s, ctx): IDate => {
      const [year, month, day] = s.split('-').map(Number);
      const d = new Date(Date.UTC(year, month - 1, day));
      if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
        ctx.addIssue({ code: 'custom', message: `invalid calendar date "${s}"` });
        return z.NEVER;
      }
      return { year, month, day };
    });

const dateFields = {
  annotationDate: dateArg()
    .optional()
    .describe('Single annotation date (YYYY-MM-DD); mutually exclusive with --start-date/--end-date'),
  startDate: dateArg()
    .optional()
    .describe('Start of the annotated date range (YYYY-MM-DD); requires --end-date'),
  endDate: dateArg()
    .optional()
    .describe('End of the annotated date range (YYYY-MM-DD); requires --start-date'),
};

const dateFlags = {
  annotationDate: '--annotation-date <date>',
  startDate: '--start-date <date>',
  endDate: '--end-date <date>',
};

interface DateInput {
  annotationDate?: IDate;
  startDate?: IDate;
  endDate?: IDate;
}

function checkDates(v: DateInput, ctx: z.RefinementCtx, required: boolean) {
  const range = v.startDate !== undefined || v.endDate !== undefined;
  if (v.annotationDate && range) {
    ctx.addIssue({
      code: 'custom',
      message: 'Use either --annotation-date or --start-date/--end-date, not both',
    });
  } else if (range && (!v.startDate || !v.endDate)) {
    ctx.addIssue({ code: 'custom', message: '--start-date and --end-date must be given together' });
  } else if (required && !v.annotationDate && !range) {
    ctx.addIssue({
      code: 'custom',
      message: 'One of --annotation-date or --start-date/--end-date is required',
    });
  }
}

function target({ annotationDate, startDate, endDate }: DateInput): IReportingDataAnnotation {
  if (annotationDate) return { annotationDate };
  if (startDate && endDate) return { annotationDateRange: { startDate, endDate } };
  return {};
}

const colorArg = z.enum(COLORS);

export const listAnnotations = listOp({
  id: 'admin.annotations.list',
  summary: 'List reporting data annotations for a property',
  rpc: 'ListReportingDataAnnotations',
  item: annotation,
  columns,
  call: async (c, ctx) =>
    (await c.listReportingDataAnnotations({ parent: parentOf('property', ctx.property) }))[0],
});

export const createAnnotation = defineOperation({
  id: 'admin.annotations.create',
  summary: 'Create a reporting data annotation',
  category: 'create',
  kind: 'resource',
  needsProperty: true,
  api: adminApi('CreateReportingDataAnnotation'),
  input: z
    .object({
      title: z.string().min(1).describe('Annotation title'),
      description: z.string().optional().describe('Annotation description'),
      color: colorArg.describe(`Annotation color (${COLORS.join(', ')})`),
      ...dateFields,
    })
    .superRefine((v, ctx) => checkDates(v, ctx, true)),
  flags: {
    title: '--title <title>',
    description: '--description <description>',
    color: '--color <color>',
    ...dateFlags,
  },
  output: annotation,
  columns,
  run: async ({ title, description, color, ...dates }, ctx) => {
    const client = await getAdminClient();
    const reportingDataAnnotation: IReportingDataAnnotation = {
      title,
      ...(description !== undefined && { description }),
      color,
      ...target(dates),
    };
    const [item] = await client.createReportingDataAnnotation({
      parent: parentOf('property', ctx.property),
      reportingDataAnnotation,
    });
    return item as z.infer<typeof annotation>;
  },
});

export const updateAnnotation = defineOperation({
  id: 'admin.annotations.update',
  summary: 'Update a reporting data annotation',
  category: 'update',
  kind: 'resource',
  api: adminApi('UpdateReportingDataAnnotation'),
  input: z
    .object({
      name: resourceName('Reporting data annotation').describe(
        'Annotation resource name (properties/<id>/reportingDataAnnotations/<id>)',
      ),
      title: z.string().min(1).optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      color: colorArg.optional().describe(`New color (${COLORS.join(', ')})`),
      ...dateFields,
    })
    .superRefine((v, ctx) => {
      checkDates(v, ctx, false);
      const { name: _name, ...changes } = v;
      if (Object.values(changes).every((x) => x === undefined)) {
        ctx.addIssue({ code: 'custom', message: 'Nothing to update: pass at least one field to change' });
      }
    }),
  flags: {
    name: '--name <resourceName>',
    title: '--title <title>',
    description: '--description <description>',
    color: '--color <color>',
    ...dateFlags,
  },
  output: annotation,
  columns,
  run: async ({ name, title, description, color, ...dates }) => {
    const client = await getAdminClient();
    const { body, paths } = updateMask(
      { title, description, color, ...target(dates) },
      {
        title: 'title',
        description: 'description',
        color: 'color',
        annotationDate: 'annotation_date',
        annotationDateRange: 'annotation_date_range',
      },
    );
    const reportingDataAnnotation: IReportingDataAnnotation = { name, ...body };
    const [item] = await client.updateReportingDataAnnotation({
      reportingDataAnnotation,
      updateMask: { paths },
    });
    return item as z.infer<typeof annotation>;
  },
});

export const deleteAnnotation = removeOp({
  id: 'admin.annotations.delete',
  summary: 'Delete a reporting data annotation',
  rpc: 'DeleteReportingDataAnnotation',
  label: 'Annotation',
  verb: 'delete',
  call: (c, name) => c.deleteReportingDataAnnotation({ name }),
});

export const annotationOps = [listAnnotations, createAnnotation, updateAnnotation, deleteAnnotation];
