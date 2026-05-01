import * as readline from 'node:readline';
import { Command } from 'commander';
import { getMetadata } from '../../services/data-api.service.js';
import { resolveGlobalOptions } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';
import { logger } from '../../utils/logger.js';
import { createSpinner } from '../../utils/spinner.js';
import { validatePropertyId } from '../../validation/validators.js';

interface Field {
  apiName: string;
  uiName: string;
  description: string;
  category: string;
  customDefinition: boolean;
  kind: 'dimension' | 'metric';
}

const HELP = [
  'Commands:',
  '  list                       Show all dimensions and metrics',
  '  list dims                  Show only dimensions',
  '  list metrics               Show only metrics',
  '  search <term>              Find fields whose api/ui name or description contains <term>',
  '  show <apiName>             Show full details for a single field',
  '  custom                     Show only custom dimensions/metrics',
  '  help                       Show this help',
  '  exit | quit | .exit        Leave the REPL',
  '',
  'Tab-completion is available for `show <apiName>`.',
].join('\n');

function flattenMetadata(meta: {
  dimensions?:
    | {
        apiName?: string | null;
        uiName?: string | null;
        description?: string | null;
        category?: string | null;
        customDefinition?: boolean | null;
      }[]
    | null;
  metrics?:
    | {
        apiName?: string | null;
        uiName?: string | null;
        description?: string | null;
        category?: string | null;
        customDefinition?: boolean | null;
      }[]
    | null;
}): Field[] {
  const dims: Field[] = (meta.dimensions ?? []).map((d) => ({
    apiName: d.apiName ?? '',
    uiName: d.uiName ?? '',
    description: d.description ?? '',
    category: d.category ?? '',
    customDefinition: !!d.customDefinition,
    kind: 'dimension' as const,
  }));
  const mets: Field[] = (meta.metrics ?? []).map((m) => ({
    apiName: m.apiName ?? '',
    uiName: m.uiName ?? '',
    description: m.description ?? '',
    category: m.category ?? '',
    customDefinition: !!m.customDefinition,
    kind: 'metric' as const,
  }));
  return [...dims, ...mets];
}

function printList(fields: Field[]): void {
  if (fields.length === 0) {
    console.log('(no matching fields)');
    return;
  }
  for (const f of fields) {
    const tag = f.kind === 'dimension' ? 'DIM' : 'MET';
    const custom = f.customDefinition ? ' (custom)' : '';
    console.log(`${tag}  ${f.apiName.padEnd(40)} ${f.uiName}${custom}`);
  }
  console.log(`\n${fields.length} field(s)`);
}

function printDetail(field: Field): void {
  console.log(`API name:       ${field.apiName}`);
  console.log(`UI name:        ${field.uiName}`);
  console.log(`Kind:           ${field.kind}`);
  console.log(`Category:       ${field.category}`);
  console.log(`Custom:         ${field.customDefinition ? 'yes' : 'no'}`);
  console.log(`Description:    ${field.description}`);
}

export function createExploreCommand(): Command {
  return new Command('explore')
    .description('Interactive REPL to browse GA4 metrics and dimensions for a property')
    .action(async (_opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const propertyId = validatePropertyId(globalOpts.property);

        const spinner = createSpinner('Loading property metadata...');
        spinner.start();
        const meta = await getMetadata(propertyId);
        spinner.stop();

        const fields = flattenMetadata(meta);
        const apiNames = fields.map((f) => f.apiName).sort();
        logger.success(
          `Loaded ${fields.length} fields (${fields.filter((f) => f.kind === 'dimension').length} dims, ` +
            `${fields.filter((f) => f.kind === 'metric').length} metrics). Type \`help\` for commands, \`exit\` to quit.`,
        );

        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          terminal: process.stdout.isTTY,
          completer: (line: string) => {
            const m = line.match(/^show\s+(\S*)$/);
            if (!m) return [[], line];
            const prefix = m[1];
            const hits = apiNames.filter((n) => n.startsWith(prefix));
            return [hits, prefix];
          },
        });
        rl.setPrompt('gacli> ');
        rl.prompt();

        rl.on('line', (raw) => {
          const line = raw.trim();
          if (!line) {
            rl.prompt();
            return;
          }
          const [cmd, ...rest] = line.split(/\s+/);

          if (cmd === 'exit' || cmd === 'quit' || cmd === '.exit') {
            rl.close();
            return;
          }

          if (cmd === 'help') {
            console.log(HELP);
          } else if (cmd === 'list') {
            const filter = rest[0];
            if (!filter) printList(fields);
            else if (filter === 'dims') printList(fields.filter((f) => f.kind === 'dimension'));
            else if (filter === 'metrics') printList(fields.filter((f) => f.kind === 'metric'));
            else
              console.log(
                `Unknown list filter: ${filter}. Use \`list\`, \`list dims\`, or \`list metrics\`.`,
              );
          } else if (cmd === 'custom') {
            printList(fields.filter((f) => f.customDefinition));
          } else if (cmd === 'search') {
            const term = rest.join(' ').toLowerCase();
            if (!term) {
              console.log('Usage: search <term>');
            } else {
              printList(
                fields.filter(
                  (f) =>
                    f.apiName.toLowerCase().includes(term) ||
                    f.uiName.toLowerCase().includes(term) ||
                    f.description.toLowerCase().includes(term),
                ),
              );
            }
          } else if (cmd === 'show') {
            const name = rest[0];
            if (!name) {
              console.log('Usage: show <apiName>');
            } else {
              const found = fields.find((f) => f.apiName === name);
              if (!found) console.log(`No field named "${name}" — try \`search ${name}\`.`);
              else printDetail(found);
            }
          } else {
            console.log(`Unknown command: ${cmd}. Type \`help\`.`);
          }

          rl.prompt();
        });

        await new Promise<void>((resolve) => {
          rl.on('close', () => resolve());
        });
      } catch (error) {
        handleError(error);
      }
    });
}
