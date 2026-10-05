import { readFileSync } from 'node:fs';
import { z } from 'zod';

export type SourceReader = (src: string | 0) => string;

const defaultRead: SourceReader = (src) => readFileSync(src, 'utf-8');

// The MCP server turns this off: a tool argument must never read the server's files or its stdin
// (stdin is the protocol channel).
let fileArgsAllowed = true;

export function setFileArgsAllowed(allowed: boolean): void {
  fileArgsAllowed = allowed;
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * A flag that carries JSON: inline (`'[{"a":1}]'`), from a file (`@steps.json`) or stdin (`@-`).
 * Read/parse/shape problems become zod issues, so they surface as usage errors (exit 2).
 */
export function jsonArg<T extends z.ZodType>(schema: T, what: string, read: SourceReader = defaultRead) {
  return z.string().transform((raw, ctx): z.output<T> => {
    let text = raw;
    let from = '';
    if (raw.startsWith('@')) {
      if (!fileArgsAllowed) {
        ctx.addIssue({
          code: 'custom',
          message: 'File references (@path, @-) are not allowed here; pass the JSON inline',
        });
        return z.NEVER;
      }
      const src = raw.slice(1);
      from = src === '-' ? 'stdin' : src;
      try {
        text = read(src === '-' ? 0 : src);
      } catch (e) {
        ctx.addIssue({ code: 'custom', message: `Cannot read ${what} from ${from}: ${errMsg(e)}` });
        return z.NEVER;
      }
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      ctx.addIssue({
        code: 'custom',
        message: `Invalid JSON for ${what}${from ? ` in ${from}` : ''}: ${errMsg(e)}`,
      });
      return z.NEVER;
    }
    const result = schema.safeParse(parsed);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const at = issue.path.length ? ` at ${issue.path.join('.')}` : '';
        ctx.addIssue({ code: 'custom', message: `${what}${at}: ${issue.message}` });
      }
      return z.NEVER;
    }
    return result.data;
  });
}
