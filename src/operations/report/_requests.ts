import { z } from 'zod';
import { jsonArg } from '../json-arg.js';

/** 1.x took a bare file path; `@path` / `@-` also work, matching the other JSON flags. */
export function requestsFile(what: string) {
  return z
    .string()
    .transform((v) => (v.startsWith('@') ? v : `@${v}`))
    .pipe(jsonArg(z.array(z.looseObject({})).min(1)))
    .describe(what);
}
