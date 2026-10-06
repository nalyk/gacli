import { type Command, Command as CommandCtor, CommanderError, Option } from 'commander';
import type { z } from 'zod';
import { type GlobalOptions, resolveGlobalOptions, writeOutput } from '../types/common.js';
import { handleError } from '../utils/error-handler.js';
import { type Spinner, startSpinner } from '../utils/spinner.js';
import { confirm } from './confirm.js';
import { GacliError } from './errors.js';
import { dryRunPreview, parseOperationInput, resolveProperty } from './invoke.js';
import { type AnyOperation, cliPath, isMutating } from './operation.js';
import { renderResult, toPlain } from './render.js';

export const GROUP_DESCRIPTIONS: Record<string, string> = {
  report: 'Google Analytics 4 Data API reporting commands',
  metadata: 'GA4 metadata operations (dimensions, metrics, compatibility)',
  audience: 'Audience export and recurring audience operations',
  'audience export': 'Audience export operations',
  'audience recurring': 'Recurring audience list operations',
  admin: 'GA4 Admin API operations',
  'admin accounts': 'Manage GA4 accounts',
  'admin properties': 'Manage GA4 properties',
  'admin datastreams': 'Manage GA4 data streams',
  'admin custom-dimensions': 'Manage GA4 custom dimensions',
  'admin custom-metrics': 'Manage GA4 custom metrics',
  'admin key-events': 'Manage GA4 key events',
  'admin audiences': 'Manage GA4 audiences',
  'admin access-bindings': 'Manage GA4 access bindings',
  'admin firebase-links': 'Manage GA4 Firebase links',
  'admin google-ads-links': 'Manage GA4 Google Ads links',
  'admin bigquery-links': 'Manage GA4 BigQuery links',
  'report tasks': 'Asynchronous report tasks (create, poll, query)',
  'admin annotations': 'Manage reporting data annotations',
  'admin change-history': 'Search account change history',
  'admin access-report': 'Run data access reports',
  'admin measurement-secrets': 'Manage Measurement Protocol secrets',
  'admin data-retention': 'Manage property data retention settings',
};

interface FieldInfo {
  type: string;
  optional: boolean;
  defaultValue?: unknown;
  description?: string;
}

// zod 4 internals: unwrap optional/default/nullable wrappers to reach the base type.
export function fieldInfo(schema: z.ZodType): FieldInfo {
  let t = schema as z.ZodType & { def: { type: string; innerType?: z.ZodType; defaultValue?: unknown } };
  let optional = false;
  let defaultValue: unknown;
  const description = schema.description;
  while (['optional', 'default', 'nullable', 'prefault'].includes(t.def.type)) {
    if (t.def.type === 'optional' || t.def.type === 'nullable') optional = true;
    if (t.def.type === 'default') defaultValue = t.def.defaultValue;
    t = t.def.innerType as typeof t;
  }
  return { type: t.def.type, optional, defaultValue, description: description ?? t.description };
}

function kebab(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

export function generatedFlag(key: string, info: FieldInfo): string {
  const name = kebab(key);
  if (info.type === 'boolean') return `--${name}`;
  if (info.type === 'array') return `--${name} <${name}...>`;
  return `--${name} <${name}>`;
}

function inputKeys(op: AnyOperation): string[] {
  return Object.keys(op.input.shape);
}

export interface FlagSpec {
  flag: string;
  /** commander attribute / input key; injected flags use fields, dryRun, yes */
  key: string;
  required: boolean;
  description: string;
  defaultValue?: unknown;
  injected?: boolean;
  hidden?: boolean;
}

/** Single source for both commander mounting and `gacli schema`. */
const RESERVED_KEYS = new Set(['fields', 'dryRun', 'yes', 'force']);

export function describeFlags(op: AnyOperation): FlagSpec[] {
  const specs: FlagSpec[] = inputKeys(op).map((key) => {
    if (RESERVED_KEYS.has(key))
      throw new Error(`Input key "${key}" of ${op.id} is reserved for an injected flag`);
    const info = fieldInfo(op.input.shape[key]);
    // A boolean that defaults to true can only be switched off: expose it as --no-<name> (commander defaults it).
    const negatable = info.type === 'boolean' && info.defaultValue === true;
    return {
      flag:
        (op.flags as Record<string, string> | undefined)?.[key] ??
        (negatable ? `--no-${kebab(key)}` : generatedFlag(key, info)),
      key,
      // A positional alternative makes the flag optional for commander; zod still requires a value.
      required: !info.optional && info.defaultValue === undefined && key !== op.positional,
      description: info.description ?? '',
      defaultValue: negatable ? undefined : info.defaultValue,
    };
  });
  const inject = (flag: string, key: string, description: string, hidden = false) =>
    specs.push({ flag, key, required: false, description, injected: true, hidden });
  inject('--fields <paths>', 'fields', 'Comma-separated fields to output (dot paths for nested values)');
  if (isMutating(op.category))
    inject('--dry-run', 'dryRun', 'Print the request that would be sent, without calling the API');
  if (op.category === 'delete') {
    inject('-y, --yes', 'yes', 'Confirm this destructive operation (required when not interactive)');
    inject('--force', 'force', 'Alias of --yes', true);
  }
  return specs;
}

function buildLeaf(op: AnyOperation, name: string): Command {
  const cmd = new CommandCtor(name).description(op.summary);
  for (const spec of describeFlags(op)) {
    const option = new Option(spec.flag, spec.description);
    if (option.attributeName() !== spec.key) {
      throw new Error(
        `Flag "${spec.flag}" of ${op.id} maps to "${option.attributeName()}", expected "${spec.key}"`,
      );
    }
    if (spec.defaultValue !== undefined) option.default(spec.defaultValue);
    if (spec.required) option.makeOptionMandatory();
    if (spec.hidden) option.hideHelp();
    cmd.addOption(option);
  }
  if (op.positional) {
    cmd.argument(`[${kebab(op.positional)}]`, `Same as --${kebab(op.positional)}`);
    cmd.action(async (value: string | undefined, opts: Record<string, unknown>, command: Command) =>
      executeOperation(
        op,
        { ...opts, [op.positional as string]: opts[op.positional as string] ?? value },
        command,
      ),
    );
    return cmd;
  }
  cmd.action(async (opts: Record<string, unknown>, command: Command) => executeOperation(op, opts, command));
  return cmd;
}

export function mountOperations(program: Command, ops: AnyOperation[]): void {
  // A leaf flag spelled like a global one (-p, --property, -f, ...) is swallowed by the global.
  const globalFlags = new Set(program.options.flatMap((o) => [o.short, o.long]).filter(Boolean));
  for (const op of ops) {
    for (const spec of describeFlags(op)) {
      const option = new Option(spec.flag);
      const clash = [option.short, option.long].find((f) => f && globalFlags.has(f));
      if (clash) throw new Error(`Flag ${clash} of ${op.id} collides with a global option`);
    }
    const path = cliPath(op);
    let parent = program;
    for (let i = 0; i < path.length - 1; i++) {
      const seg = path[i];
      let child = parent.commands.find((c) => c.name() === seg);
      if (!child) {
        child = new CommandCtor(seg).description(GROUP_DESCRIPTIONS[path.slice(0, i + 1).join(' ')] ?? '');
        parent.addCommand(child);
      }
      parent = child;
    }
    const leafName = path[path.length - 1];
    if (parent.commands.some((c) => c.name() === leafName)) {
      throw new Error(`Duplicate command path: ${path.join(' ')}`);
    }
    parent.addCommand(buildLeaf(op, leafName));
  }
}

/** Route every commander error through handleError (the only error printer) instead of process.exit. */
export function finalizeProgram(program: Command): void {
  const visit = (cmd: Command) => {
    cmd.exitOverride();
    cmd.configureOutput({ outputError: () => {} });
    for (const sub of cmd.commands) visit(sub);
  };
  visit(program);
}

export async function runProgram(program: Command, argv: string[] = process.argv): Promise<void> {
  try {
    await program.parseAsync(argv);
  } catch (err) {
    if (err instanceof CommanderError) {
      if (err.code === 'commander.helpDisplayed' || err.code === 'commander.version') process.exit(0);
      // A group invoked without a subcommand: commander already printed help to stderr.
      if (err.code === 'commander.help') process.exit(err.exitCode);
      try {
        resolveGlobalOptions(program); // picks JSON errors when -f json / piped / agent
      } catch {
        // invalid -f itself: fall through with text errors
      }
    }
    handleError(err);
  }
}

function shellQuote(arg: string): string {
  return /^[\w@%+=:,./-]+$/.test(arg) ? arg : JSON.stringify(arg);
}

async function confirmDelete(op: AnyOperation, globals: GlobalOptions): Promise<void> {
  const path = cliPath(op).join(' ');
  if (globals.interactive) {
    if (await confirm(`${op.summary} (gacli ${path})? [y/N] `)) return;
    throw new GacliError('confirmation', 'Aborted.');
  }
  throw new GacliError('confirmation', `Refusing to run "gacli ${path}" without --yes.`, {
    hint: `Re-run: gacli ${process.argv.slice(2).map(shellQuote).join(' ')} --yes`,
  });
}

async function executeOperation(
  op: AnyOperation,
  opts: Record<string, unknown>,
  command: Command,
): Promise<void> {
  let spinner: Spinner | undefined;
  try {
    const globals = resolveGlobalOptions(command);
    const property = resolveProperty(op, globals.property);
    const longFlag = new Map(describeFlags(op).map((f) => [f.key, f.flag.match(/--[\w-]+/)?.[0] ?? f.key]));
    const input = parseOperationInput(op, opts, (k) => longFlag.get(k) ?? k);
    const fields =
      typeof opts.fields === 'string'
        ? opts.fields
            .split(',')
            .map((f) => f.trim())
            .filter(Boolean)
        : undefined;
    const pretty = !!process.stdout.isTTY;

    if (isMutating(op.category) && opts.dryRun) {
      writeOutput(JSON.stringify(dryRunPreview(op, property, input), null, pretty ? 2 : undefined), globals);
      return;
    }
    if (op.category === 'delete' && !opts.yes && !opts.force) {
      await confirmDelete(op, globals);
    }

    if (globals.interactive && globals.format !== 'json' && globals.format !== 'ndjson') {
      spinner = await startSpinner(`${op.summary}...`);
    }
    const result = await op.run(input, { property, globals, interactive: globals.interactive });
    spinner?.stop();

    const data = op.kind === 'resource' ? toPlain(result) : result;
    writeOutput(renderResult(op, data, { format: globals.format, fields, pretty }), globals);
  } catch (error) {
    spinner?.stop();
    handleError(error);
  }
}
