import { Command, Option } from 'commander';
import { z } from 'zod';
import { GacliError } from '../../core/errors.js';
import { renderResult, toPlain } from '../../core/render.js';
import { jsonArg } from '../../operations/json-arg.js';
import { resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';

const bodySchema = jsonArg(z.record(z.string(), z.unknown()));

export function createApiCommand(): Command {
  return new Command('api')
    .description(
      'Call any GA4 Admin/Data RPC directly (escape hatch for methods without a dedicated command), e.g. ' +
        'gacli api admin ListAccountSummaries, gacli api data.v1alpha GetPropertyQuotasSnapshot --body \'{"name":"properties/1/propertyQuotasSnapshot"}\'',
    )
    .argument('<service>', 'admin (v1alpha), admin.v1beta, data (v1beta) or data.v1alpha')
    .argument('<method>', 'RPC name, e.g. ListProperties or listProperties')
    .option('--body <json>', 'Request body: inline JSON, @file or @- (stdin)', '{}')
    .option('--dry-run', 'Print the request instead of calling the API')
    .option('-y, --yes', 'Confirm Delete*/Archive* methods (required when not interactive)')
    .addOption(new Option('--force', 'Alias of --yes').hideHelp())
    .option('--fields <paths>', 'Comma-separated fields to output (dot paths for nested values)')
    .action(
      async (
        service: string,
        method: string,
        opts: { body: string; dryRun?: boolean; yes?: boolean; force?: boolean; fields?: string },
        command: Command,
      ) => {
        try {
          const globals = resolveGlobalOptions(command);
          const parsed = bodySchema.safeParse(opts.body);
          if (!parsed.success) {
            throw new GacliError('usage', `--body: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
          }
          const { executeApiCall } = await import('./resolve.js');
          const out = await executeApiCall({
            service,
            method,
            body: parsed.data,
            dryRun: opts.dryRun,
            yes: opts.yes || opts.force,
            interactive: globals.interactive,
          });
          const pretty = !!process.stdout.isTTY;
          if (out.preview) {
            writeOutput(JSON.stringify(out.preview, null, pretty ? 2 : undefined), globals);
            return;
          }
          const fields = opts.fields
            ?.split(',')
            .map((f) => f.trim())
            .filter(Boolean);
          writeOutput(
            renderResult({ kind: 'resource' }, toPlain(out.result), {
              format: globals.format,
              fields,
              pretty,
            }),
            globals,
          );
        } catch (error) {
          handleError(error);
        }
      },
    );
}
