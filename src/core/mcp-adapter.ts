import { fromJsonSchema, McpServer, type ToolAnnotations } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { GlobalOptions } from '../types/common.js';
import { jsonOutputSchema, reportEnvelope } from './catalog.js';
import { toGacliError } from './errors.js';
import { dryRunPreview, parseOperationInput, resolveProperty, toEnvelope } from './invoke.js';
import { type AnyOperation, isMutating } from './operation.js';
import { toPlain } from './render.js';

export interface ServerFactoryOptions {
  version: string;
  globals: GlobalOptions;
  defaultProperty?: string;
  allowWrite?: boolean;
  allowDelete?: boolean;
}

export function toolName(op: Pick<AnyOperation, 'id'>): string {
  return `ga_${op.id.replace(/[.-]/g, '_')}`;
}

export function toolAnnotations(op: AnyOperation): ToolAnnotations {
  if (op.category === 'read') {
    return { title: op.summary, readOnlyHint: true, idempotentHint: true, openWorldHint: true };
  }
  return {
    title: op.summary,
    readOnlyHint: false,
    destructiveHint: op.category === 'delete',
    openWorldHint: true,
  };
}

export function exposedOperations(
  ops: AnyOperation[],
  { allowWrite = false, allowDelete = false }: { allowWrite?: boolean; allowDelete?: boolean },
): AnyOperation[] {
  return ops.filter((op) => {
    if (op.category === 'read') return true;
    if (op.category === 'delete') return allowDelete;
    return allowWrite || allowDelete;
  });
}

/** Tool arguments = operation input + MCP-only controls (property, dry run, delete confirmation). */
export function toolInputSchema(op: AnyOperation, defaultProperty?: string): z.ZodObject {
  const extra: Record<string, z.ZodType> = {};
  if (op.needsProperty) {
    const id = z
      .string()
      .regex(/^(properties\/)?\d+$/)
      .describe('GA4 property ID (numeric)');
    extra.propertyId = defaultProperty ? id.optional() : id;
  }
  if (isMutating(op.category))
    extra.dryRun = z.boolean().optional().describe('Return the request instead of calling the API');
  if (op.category === 'delete')
    extra.confirm = z.literal(true).describe('Must be true: this operation is destructive');
  return op.input.extend(extra);
}

const dryRunFields = {
  dryRun: z.literal(true).optional(),
  preview: z
    .object({
      operation: z.string(),
      rpc: z.string().optional(),
      property: z.string().optional(),
      input: z.unknown(),
    })
    .optional()
    .describe('Present instead of the result when dryRun was requested'),
};

/**
 * MCP requires an object and validates every result against it: batch reports are wrapped as
 * { reports: [...] }, and mutating tools also allow the dry-run preview shape.
 */
export function toolOutputSchema(op: AnyOperation): z.ZodObject {
  const base =
    op.kind === 'reports'
      ? z.object({ reports: z.array(reportEnvelope) })
      : (jsonOutputSchema(op) as z.ZodObject);
  return isMutating(op.category) ? base.partial().extend(dryRunFields) : base;
}

function structured(op: AnyOperation, result: unknown): Record<string, unknown> {
  if (op.kind === 'reports') {
    const env = toEnvelope(op, result);
    return { reports: Array.isArray(env) ? env : [env] };
  }
  return toEnvelope(op, op.kind === 'resource' ? toPlain(result) : result) as Record<string, unknown>;
}

const json = (schema: z.ZodType, io: 'input' | 'output') =>
  fromJsonSchema(
    z.toJSONSchema(schema, { io, unrepresentable: 'any' }) as Parameters<typeof fromJsonSchema>[0],
  );

function register(server: McpServer, op: AnyOperation, opts: ServerFactoryOptions): void {
  server.registerTool(
    toolName(op),
    {
      title: op.summary,
      description: [op.summary, op.description].filter(Boolean).join('\n\n'),
      inputSchema: json(toolInputSchema(op, opts.defaultProperty), 'input'),
      outputSchema: json(toolOutputSchema(op), 'output'),
      annotations: toolAnnotations(op),
    },
    async (rawArgs: unknown) => {
      try {
        const { propertyId, dryRun, confirm: _confirm, ...args } = (rawArgs ?? {}) as Record<string, unknown>;
        const property = resolveProperty(op, (propertyId as string | undefined) ?? opts.defaultProperty);
        const input = parseOperationInput(op, args);
        if (dryRun && isMutating(op.category)) {
          const { dryRun: _flag, ...preview } = dryRunPreview(op, property, input);
          const content = { dryRun: true as const, preview };
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(content) }],
            structuredContent: content,
          };
        }
        const result = await op.run(input, { property, globals: opts.globals, interactive: false });
        const content = structured(op, result);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(content) }],
          structuredContent: content,
        };
      } catch (error) {
        const e = toGacliError(error);
        return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify(e.toJSON()) }] };
      }
    },
  );
}

export function createServerFactory(ops: AnyOperation[], opts: ServerFactoryOptions): () => McpServer {
  const exposed = exposedOperations(ops, opts);
  return () => {
    const server = new McpServer({ name: 'gacli', version: opts.version });
    for (const op of exposed) register(server, op, opts);
    return server;
  };
}
