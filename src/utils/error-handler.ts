import { getGrpcCode, getGrpcMessage, isDailyQuotaError } from './grpc-error.js';
import { logger } from './logger.js';

function describeGrpcError(code: number, message: string, error: Error): { text: string; exitCode: number } {
  switch (code) {
    case 3:
      return { text: `Invalid argument: ${message}`, exitCode: 3 };
    case 4:
      return { text: `Deadline exceeded — retry or narrow the date range: ${message}`, exitCode: 1 };
    case 5:
      return { text: `Not found: ${message}`, exitCode: 5 };
    case 7:
      return { text: `Permission denied: ${message}`, exitCode: 7 };
    case 8:
      return {
        text: isDailyQuotaError(error)
          ? `Resource exhausted (quota): ${message}. Daily quota exhausted; resets at midnight Pacific.`
          : `Resource exhausted (quota): ${message}`,
        exitCode: 8,
      };
    case 14:
      return { text: `Service unavailable — retry shortly: ${message}`, exitCode: 1 };
    case 16:
      return {
        text: `Unauthenticated: ${message}. Check your credentials or run \`gacli auth login\` to re-authenticate.`,
        exitCode: 16,
      };
    default:
      return { text: `API error (${code}): ${message}`, exitCode: 1 };
  }
}

export function handleError(error: unknown): never {
  if (!(error instanceof Error)) {
    logger.error(String(error));
    process.exit(1);
  }

  const code = getGrpcCode(error);
  if (code !== undefined) {
    const { text, exitCode } = describeGrpcError(code, getGrpcMessage(error), error);
    logger.error(text);
    process.exit(exitCode);
  }

  logger.error(error.message);
  if (error.stack && (process.env.GACLI_VERBOSE === '1' || logger.isVerbose())) {
    console.error(error.stack);
  }
  process.exit(1);
}
