import { z } from 'zod';
import { jsonArg } from '../json-arg.js';

/** 1.x took a bare file path; `@path` / `@-` and inline JSON (`[...]`) also work. */
export function requestsFile(what: string) {
  return z
    .string()
    .transform((v) => (v.startsWith('@') || /^\s*[[{]/.test(v) ? v : `@${v}`))
    .pipe(jsonArg(z.array(z.looseObject({})).min(1), '--requests'))
    .describe(what);
}
