import { Command } from 'commander';
import { getAccessToken } from '../../services/auth.service.js';
import { resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';

export function createTokenCommand(): Command {
  return new Command('token')
    .description(
      'Print an access token for the active credentials (for scripts: curl -H "Authorization: Bearer $(gacli auth token)")',
    )
    .action(async (_opts: unknown, command: Command) => {
      try {
        const globals = resolveGlobalOptions(command);
        writeOutput(await getAccessToken(), globals);
      } catch (error) {
        handleError(error);
      }
    });
}
