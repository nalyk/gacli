import { confirm } from '../../core/confirm.js';
import { GacliError } from '../../core/errors.js';
import { ensureCredentials, getAuthClientOptions } from '../../services/auth.service.js';
import { withRetry } from '../../utils/retry.js';

export type ApiService = 'admin' | 'data';
export type ApiVersion = 'v1alpha' | 'v1beta';
export interface ApiTarget {
  service: ApiService;
  version: ApiVersion;
}

const DEFAULT_VERSION: Record<ApiService, ApiVersion> = { admin: 'v1alpha', data: 'v1beta' };
const PROTO_SERVICE: Record<ApiService, Record<ApiVersion, string>> = {
  admin: { v1alpha: 'AnalyticsAdminService', v1beta: 'AnalyticsAdminService' },
  data: { v1alpha: 'AlphaAnalyticsData', v1beta: 'BetaAnalyticsData' },
};
const CLIENT_CLASS: Record<ApiService, Record<ApiVersion, string>> = {
  admin: { v1alpha: 'AnalyticsAdminServiceClient', v1beta: 'AnalyticsAdminServiceClient' },
  data: { v1alpha: 'AlphaAnalyticsDataClient', v1beta: 'BetaAnalyticsDataClient' },
};

export function parseServiceArg(arg: string): ApiTarget {
  const [service, version] = arg.split('.') as [string, string | undefined];
  if (service !== 'admin' && service !== 'data') {
    throw new GacliError('usage', `Unknown service "${arg}".`, {
      hint: 'Use admin, admin.v1beta, data or data.v1alpha.',
    });
  }
  if (version !== undefined && version !== 'v1alpha' && version !== 'v1beta') {
    throw new GacliError('usage', `Unknown API version "${version}".`, { hint: 'Use v1alpha or v1beta.' });
  }
  return { service, version: (version as ApiVersion | undefined) ?? DEFAULT_VERSION[service] };
}

interface ProtoType {
  prototype: object;
  fromObject(object: Record<string, unknown>): object;
  toObject(
    message: object,
    options: { enums: StringConstructor; longs: StringConstructor },
  ): Record<string, unknown>;
  verify(message: object): string | null;
}

/** First path whose scalar did not survive fromObject → toObject (e.g. "x" silently became 0). */
function lossyPath(sent: unknown, back: unknown, path: string): string | undefined {
  if (Array.isArray(sent)) {
    const arr = Array.isArray(back) ? back : [];
    for (let i = 0; i < sent.length; i++) {
      const p = lossyPath(sent[i], arr[i], `${path}[${i}]`);
      if (p) return p;
    }
    return undefined;
  }
  if (sent && typeof sent === 'object') {
    const obj = (back && typeof back === 'object' ? back : {}) as Record<string, unknown>;
    for (const [k, v] of Object.entries(sent)) {
      const p = lossyPath(v, obj[k], path ? `${path}.${k}` : k);
      if (p) return p;
    }
    return undefined;
  }
  if (sent === null || sent === undefined) return undefined;
  const same = String(sent) === String(back) || (typeof sent === 'string' && Number(sent) === back);
  return same ? undefined : path;
}

async function loadModule(service: ApiService): Promise<Record<string, unknown>> {
  return (
    service === 'admin' ? await import('@google-analytics/admin') : await import('@google-analytics/data')
  ) as Record<string, unknown>;
}

/** RPC names and request types come from the SDK's protobuf descriptors, so every RPC is reachable. */
async function loadDescriptor(target: ApiTarget) {
  const mod = await loadModule(target.service);
  const protos = mod.protos as Record<
    string,
    Record<string, Record<string, Record<string, Record<string, unknown>>>>
  >;
  const ns = protos.google.analytics[target.service][target.version] as Record<string, unknown>;
  const service = ns[PROTO_SERVICE[target.service][target.version]] as { prototype: object };
  const names = Object.getOwnPropertyNames(service.prototype).filter((n) => n !== 'constructor');
  const requestType = (method: string) =>
    ns[`${method[0].toUpperCase()}${method.slice(1)}Request`] as ProtoType | undefined;
  return { names, requestType };
}

function distance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

export function resolveMethod(input: string, names: string[]): string {
  const wanted = input.toLowerCase();
  const exact = names.find((n) => n.toLowerCase() === wanted);
  if (exact) return exact;
  const suggestions = [...names]
    .map((n) => ({ n, d: n.toLowerCase().includes(wanted) ? 0 : distance(wanted, n.toLowerCase()) }))
    .sort((x, y) => x.d - y.d)
    .slice(0, 5)
    .map((x) => x.n);
  throw new GacliError('usage', `Unknown method "${input}".`, {
    hint: `Did you mean: ${suggestions.join(', ')}?`,
  });
}

export function methodKind(method: string): 'read' | 'mutate' | 'delete' {
  if (/^(delete|archive|batchDelete|submitUserDeletion|cancel)/.test(method)) return 'delete';
  if (/^(get|list|search|check|query|batchGet)/.test(method) || /^(run|batchRun)\w*Report/.test(method))
    return 'read';
  return 'mutate';
}

async function defaultLoadClient(target: ApiTarget): Promise<Record<string, unknown>> {
  const mod = await loadModule(target.service);
  const versioned = mod[target.version] as Record<string, new (opts: unknown) => Record<string, unknown>>;
  const Client = versioned[CLIENT_CLASS[target.service][target.version]];
  return new Client(getAuthClientOptions());
}

/** Proto JSON accepts enum names and string int64s: convert with fromObject, then verify; unknown keys are typos. */
function validateBody(method: string, type: ProtoType | undefined, body: Record<string, unknown>): void {
  if (!type) return;
  // Static protobufjs classes declare every field (with its default) on the prototype.
  const fields = Object.getOwnPropertyNames(type.prototype).filter(
    (n) => n !== 'constructor' && n !== 'toJSON',
  );
  const unknown = Object.keys(body).filter((k) => !fields.includes(k));
  if (unknown.length) {
    throw new GacliError('usage', `Unknown field(s) for ${method}: ${unknown.join(', ')}`, {
      hint: `Valid fields: ${fields.join(', ')}`,
    });
  }
  let problem: string | null;
  try {
    const message = type.fromObject(body);
    problem = type.verify(message);
    const lossy = problem
      ? undefined
      : lossyPath(body, type.toObject(message, { enums: String, longs: String }), '');
    if (lossy) problem = `${lossy}: invalid value`;
  } catch (e) {
    problem = e instanceof Error ? e.message : String(e);
  }
  if (problem) throw new GacliError('usage', `Invalid request body for ${method}: ${problem}`);
}

/**
 * Long-running methods resolve to a gax Operation whose object graph includes the auth client
 * (tokens, client secret, private key): only its google.longrunning.Operation snapshot is output.
 */
function unwrapOperation(result: unknown): unknown {
  if (result && typeof result === 'object' && 'latestResponse' in result) {
    return (result as { latestResponse: unknown }).latestResponse;
  }
  return result;
}

export interface ApiCall {
  service: string;
  method: string;
  body: Record<string, unknown>;
  dryRun?: boolean;
  yes?: boolean;
  interactive: boolean;
}

export async function executeApiCall(
  call: ApiCall,
  deps: { loadClient: (t: ApiTarget) => Promise<object>; ensureCredentials: () => Promise<void> } = {
    loadClient: defaultLoadClient,
    ensureCredentials,
  },
): Promise<{ preview?: Record<string, unknown>; result?: unknown }> {
  const target = parseServiceArg(call.service);
  const { names, requestType } = await loadDescriptor(target);
  const method = resolveMethod(call.method, names);
  validateBody(method, requestType(method), call.body);

  const kind = methodKind(method);
  if (call.dryRun) {
    return { preview: { dryRun: true, ...target, method, request: call.body } };
  }
  if (kind === 'delete' && !call.yes) {
    if (!call.interactive) {
      throw new GacliError('confirmation', `Refusing to run ${method} without --yes.`, {
        hint: 'Re-run with --yes.',
      });
    }
    if (!(await confirm(`Run ${target.service}.${target.version} ${method}? [y/N] `))) {
      throw new GacliError('confirmation', 'Aborted.');
    }
  }

  await deps.ensureCredentials();
  const client = (await deps.loadClient(target)) as Record<string, (req: object) => Promise<unknown>>;
  const invoke = () => client[method](call.body);
  const response = kind === 'read' ? await withRetry(invoke, { label: method }) : await invoke();
  return { result: unwrapOperation(Array.isArray(response) ? response[0] : response) };
}
