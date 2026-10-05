import { CommanderError } from 'commander';
import { ZodError, type z } from 'zod';
import { getGrpcCode, getGrpcMessage, isDailyQuotaError } from '../utils/grpc-error.js';

export type ErrorKind = 'usage' | 'auth' | 'not_found' | 'quota' | 'confirmation' | 'api' | 'internal';

export const EXIT_CODES: Record<ErrorKind, number> = {
  usage: 2,
  auth: 3,
  confirmation: 4,
  not_found: 5,
  quota: 6,
  api: 1,
  internal: 1,
};

export class GacliError extends Error {
  readonly kind: ErrorKind;
  readonly hint?: string;
  readonly grpcStatus?: number;

  constructor(
    kind: ErrorKind,
    message: string,
    opts: { hint?: string; grpcStatus?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: opts.cause });
    this.name = 'GacliError';
    this.kind = kind;
    this.hint = opts.hint;
    this.grpcStatus = opts.grpcStatus;
  }

  get exitCode(): number {
    return EXIT_CODES[this.kind];
  }

  toJSON(): {
    error: { code: string; message: string; hint?: string; grpcStatus?: number; exitCode: number };
  } {
    return {
      error: {
        code: this.kind.toUpperCase(),
        message: this.message,
        ...(this.hint ? { hint: this.hint } : {}),
        ...(this.grpcStatus !== undefined ? { grpcStatus: this.grpcStatus } : {}),
        exitCode: this.exitCode,
      },
    };
  }
}

/** One line per issue: "<label>: <message>". `label` maps the first path segment (e.g. input key → --flag). */
export function formatZodIssues(
  issues: readonly z.core.$ZodIssue[],
  label: (key: string) => string = (k) => k,
): string {
  return issues
    .map((i) => {
      const [head, ...rest] = i.path.map(String);
      const where = head === undefined ? '' : [label(head), ...rest].join('.');
      return where ? `${where}: ${i.message}` : i.message;
    })
    .join('\n');
}

function fromGrpc(code: number, err: Error): GacliError {
  const msg = getGrpcMessage(err);
  const o = (hint?: string) => ({ hint, grpcStatus: code, cause: err });
  switch (code) {
    case 3:
      return new GacliError('usage', `Invalid argument: ${msg}`, o());
    case 4:
      return new GacliError(
        'api',
        `Deadline exceeded: ${msg}`,
        o('Retry, or narrow the date range / row limit.'),
      );
    case 5:
      return new GacliError('not_found', `Not found: ${msg}`, o('Check the property ID or resource name.'));
    case 7:
      return new GacliError(
        'auth',
        `Permission denied: ${msg}`,
        o('Check that the credentials have access to this property and the analytics.edit scope for writes.'),
      );
    case 8:
      return new GacliError(
        'quota',
        `Resource exhausted (quota): ${msg}`,
        o(
          isDailyQuotaError(err)
            ? 'Daily quota exhausted; resets at midnight Pacific.'
            : 'Wait a minute and retry.',
        ),
      );
    case 14:
      return new GacliError('api', `Service unavailable: ${msg}`, o('Retry shortly.'));
    case 16:
      return new GacliError(
        'auth',
        `Unauthenticated: ${msg}`,
        o('Run `gacli auth login` or check your credentials.'),
      );
    default:
      return new GacliError('api', `API error (${code}): ${msg}`, o());
  }
}

export function toGacliError(err: unknown): GacliError {
  if (err instanceof GacliError) return err;
  if (err instanceof ZodError) return new GacliError('usage', formatZodIssues(err.issues), { cause: err });
  if (err instanceof CommanderError) {
    return new GacliError('usage', err.message.replace(/^error: /, ''), { cause: err });
  }
  if (!(err instanceof Error)) return new GacliError('internal', String(err));
  const code = getGrpcCode(err);
  if (code !== undefined) return fromGrpc(code, err);
  if (err.message.startsWith('Could not load the default credentials')) {
    return new GacliError('auth', 'No credentials configured.', {
      cause: err,
      hint: 'Run `gacli auth login`, set GOOGLE_APPLICATION_CREDENTIALS / `gacli config set credentials <sa.json>`, export GACLI_ACCESS_TOKEN, or run `gcloud auth application-default login`.',
    });
  }
  if (err.message.startsWith('No credentials configured')) {
    return new GacliError('auth', err.message, { cause: err });
  }
  return new GacliError('internal', err.message, { cause: err });
}

let jsonErrors = false;

export function setJsonErrors(on: boolean): void {
  jsonErrors = on;
}

export function jsonErrorsEnabled(): boolean {
  return jsonErrors;
}
