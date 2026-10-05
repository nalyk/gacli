import { jsonErrorsEnabled, toGacliError } from '../core/errors.js';
import { logger } from './logger.js';

export function handleError(error: unknown): never {
  const e = toGacliError(error);

  if (jsonErrorsEnabled()) {
    process.stderr.write(`${JSON.stringify(e.toJSON())}\n`);
  } else {
    logger.error(e.message);
    if (e.hint) logger.info(`hint: ${e.hint}`);
  }

  const cause = e.cause instanceof Error ? e.cause : e;
  if (cause.stack && (process.env.GACLI_VERBOSE === '1' || logger.isVerbose())) {
    console.error(cause.stack);
  }
  process.exit(e.exitCode);
}
