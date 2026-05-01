import { logger } from './logger.js';

const RETRYABLE_GRPC_CODES = new Set([
  8, // RESOURCE_EXHAUSTED (quota)
  14, // UNAVAILABLE
]);

const DEFAULT_MAX_RETRIES = Number(process.env.GACLI_MAX_RETRIES ?? 3);
const DEFAULT_BASE_MS = Number(process.env.GACLI_RETRY_BASE_MS ?? 500);

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  label?: string;
}

function extractGrpcCode(err: unknown): number | undefined {
  if (!(err instanceof Error)) return undefined;
  const m = err.message.match(/^(\d+)\s/);
  return m ? Number.parseInt(m[1], 10) : undefined;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = opts.baseDelayMs ?? DEFAULT_BASE_MS;
  const label = opts.label ?? 'request';

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const code = extractGrpcCode(err);
      const retriable = code !== undefined && RETRYABLE_GRPC_CODES.has(code);
      if (!retriable || attempt === maxRetries) {
        throw err;
      }
      // Exponential backoff with full jitter: random in [0, base * 2^attempt]
      const cap = baseDelayMs * 2 ** attempt;
      const delay = Math.floor(Math.random() * cap);
      logger.debug(
        `${label} failed with gRPC ${code} (attempt ${attempt + 1}/${maxRetries + 1}); retrying in ${delay}ms`,
      );
      await sleep(delay);
    }
  }
  throw lastErr;
}
