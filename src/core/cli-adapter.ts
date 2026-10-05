import { type Command, Command as CommandCtor, CommanderError, Option } from 'commander';
import type { z } from 'zod';
import { type GlobalOptions, resolveGlobalOptions, writeOutput } from '../types/common.js';
import { handleError } from '../utils/error-handler.js';
import { createSpinner } from '../utils/spinner.js';
import { validatePropertyId } from '../validation/validators.js';
import { confirm } from './confirm.js';
import { GacliError } from './errors.js';
import { type AnyOperation, cliPath, isMutating } from './operation.js';
import { renderResult, toPlain } from './render.js';

export const GROUP_DESCRIPTIONS: Record<string, string> = {
  report: 'Google Analytics 4 Data API reporting commands',
  metadata: 'GA4 metadata operations (dimensions, metrics, compatibility)',
  audience: 'Audience export and recurring audience operations',
  'audience export': 'Audience exports (one-off snapshots of audience members)',
  'audience recurring': 'Recurring audience lists',
  admin: 'GA4 Admin API operations',
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
export function describeFlags(op: AnyOperation): FlagSpec[] {
  const specs: FlagSpec[] = inputKeys(op).map((key) => {
    const info = fieldInfo(op.input.shape[key]);
    return {
      flag: (op.flags as Record<string, string> | undefined)?.[key] ?? generatedFlag(key, info),
      key,
      required: !info.optional && info.defaultValue === undefined && info.type !== 'boolean',
      description: info.description ?? '',
      defaultValue: info.defaultValue,
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
  cmd.action(async (opts: Record<string, unknown>, command: Command) => executeOperation(op, opts, command));
  return cmd;
}

export function mountOperations(program: Command, ops: AnyOperation[]): void {
  for (const op of ops) {
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
  let spinner: ReturnType<typeof createSpinner> | undefined;
  try {
    const globals = resolveGlobalOptions(command);
    const property = op.needsProperty ? validatePropertyId(globals.property) : '';
    const input = op.input.parse(Object.fromEntries(inputKeys(op).map((k) => [k, opts[k]])));
    const fields =
      typeof opts.fields === 'string'
        ? opts.fields
            .split(',')
            .map((f) => f.trim())
            .filter(Boolean)
        : undefined;
    const pretty = !!process.stdout.isTTY;

    if (isMutating(op.category) && opts.dryRun) {
      const preview = {
        dryRun: true,
        operation: op.id,
        rpc: op.api?.rpc,
        property: property || undefined,
        input,
      };
      writeOutput(JSON.stringify(preview, null, pretty ? 2 : undefined), globals);
      return;
    }
    if (op.category === 'delete' && !opts.yes && !opts.force) {
      await confirmDelete(op, globals);
    }

    if (globals.interactive && globals.format !== 'json' && globals.format !== 'ndjson') {
      spinner = createSpinner(`${op.summary}...`).start();
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
