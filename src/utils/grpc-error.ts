export function getGrpcCode(err: unknown): number | undefined {
  if (!(err instanceof Error)) return undefined;
  const code = (err as { code?: unknown }).code;
  if (typeof code === 'number' && Number.isInteger(code) && code >= 0 && code <= 16) return code;
  const m = err.message.match(/^(\d+)\s/);
  return m ? Number.parseInt(m[1], 10) : undefined;
}

export function getGrpcMessage(err: Error): string {
  return err.message.replace(/^\d+\s+(?:[A-Z_]+:\s*)?/, '');
}

export function isDailyQuotaError(err: unknown): boolean {
  return getGrpcCode(err) === 8 && err instanceof Error && /per day/i.test(err.message);
}
