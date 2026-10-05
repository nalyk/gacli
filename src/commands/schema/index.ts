import { Command } from 'commander';
import { buildCatalog, toLlmsMarkdown } from '../../core/catalog.js';
import { GacliError } from '../../core/errors.js';
import type { AnyOperation } from '../../core/operation.js';
import { resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';

export { AGENT_HELP } from './agent-help.js';

export function createSchemaCommand(ops: AnyOperation[]): Command {
  return new Command('schema')
    .description('Describe operations as JSON (flags, input/output JSON Schema) for scripts and AI agents')
    .argument('[path...]', 'Command path prefix to filter, e.g. "admin custom-dimensions"')
    .option('--llms', 'Print a compact Markdown reference instead of JSON')
    .action((path: string[], opts: { llms?: boolean }, command: Command) => {
      try {
        const globals = resolveGlobalOptions(command);
        const catalog = buildCatalog(ops);
        const prefix = path.length ? `gacli ${path.join(' ')}` : 'gacli';
        const operations = catalog.operations.filter(
          (o) => o.command === prefix || o.command.startsWith(`${prefix} `),
        );
        if (!operations.length) {
          throw new GacliError('usage', `No operations under "${path.join(' ')}".`, {
            hint: 'Run `gacli schema` to list every operation.',
          });
        }
        const filtered = { ...catalog, operations };
        const text = opts.llms
          ? toLlmsMarkdown(filtered)
          : JSON.stringify(filtered, null, process.stdout.isTTY ? 2 : undefined);
        writeOutput(text, globals);
      } catch (error) {
        handleError(error);
      }
    });
}
