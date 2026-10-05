import { z } from 'zod';
import { GacliError } from '../../core/errors.js';
import { defineOperation } from '../../core/operation.js';
import { chat } from '../../services/data-api.service.js';
import { getGrpcCode, getGrpcMessage } from '../../utils/grpc-error.js';

const block = z.looseObject({
  text: z.string().nullish(),
  table: z
    .looseObject({
      headers: z
        .array(z.looseObject({ header: z.string().nullish(), dataType: z.string().nullish() }))
        .nullish(),
      rows: z
        .array(z.looseObject({ columns: z.array(z.looseObject({ value: z.string().nullish() })).nullish() }))
        .nullish(),
    })
    .nullish(),
});

type Block = z.infer<typeof block>;

const chatResult = z.looseObject({
  sessionId: z.string().nullish(),
  text: z.string().describe('All response blocks rendered as plain text (tables as "a | b" lines)'),
  blocks: z.array(block),
  propertyQuota: z.looseObject({}).nullish(),
});

function renderBlock(b: Block): string {
  if (b.text) return b.text;
  if (!b.table) return '';
  const header = (b.table.headers ?? []).map((h) => h.header ?? '').join(' | ');
  const rows = (b.table.rows ?? []).map((r) => (r.columns ?? []).map((c) => c.value ?? '').join(' | '));
  return [header, ...rows].join('\n');
}

function isScopeError(err: unknown): err is Error {
  const code = getGrpcCode(err);
  return (code === 7 || code === 16) && err instanceof Error && /scope/i.test(err.message);
}

export const reportChat = defineOperation({
  id: 'report.chat',
  summary: 'Ask a natural-language question about the property (GA4 Data API chat, alpha)',
  description:
    'Needs the https://www.googleapis.com/auth/analytics.chatbot.read scope. Pass the returned session ID ' +
    'back with --session to continue the conversation. Answers are AI-generated and may be inaccurate.',
  category: 'read',
  kind: 'resource',
  needsProperty: true,
  api: { service: 'data', version: 'v1alpha', rpc: 'Chat' },
  input: z.object({
    question: z.string().min(1).describe("The question to ask about this property's Analytics data"),
    session: z
      .string()
      .min(1)
      .optional()
      .describe('Session ID from a previous answer, to continue that conversation (omit to start a new one)'),
  }),
  flags: { question: '--question <text>', session: '--session <id>' },
  output: chatResult,
  columns: [
    { header: 'Response', path: 'text' },
    { header: 'Session', path: 'sessionId' },
  ],
  run: async ({ question, session }, ctx) => {
    try {
      const response = await chat({
        property: `properties/${ctx.property}`,
        userQuery: question,
        ...(session && { sessionId: session }),
      });
      const blocks = (response.blocks ?? []) as Block[];
      return {
        sessionId: response.sessionId ?? null,
        text: blocks.map(renderBlock).filter(Boolean).join('\n\n'),
        blocks,
        propertyQuota: (response.propertyQuota ?? null) as Record<string, unknown> | null,
      };
    } catch (err) {
      if (isScopeError(err)) {
        throw new GacliError('auth', `Chat needs the analytics.chatbot.read scope: ${getGrpcMessage(err)}`, {
          hint: 'Re-run gacli auth login --scopes chat (OAuth) or set GACLI_SCOPES=chat for service accounts',
          grpcStatus: getGrpcCode(err),
          cause: err,
        });
      }
      throw err;
    }
  },
});
