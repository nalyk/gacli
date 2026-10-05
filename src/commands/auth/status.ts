import { existsSync } from 'node:fs';
import { Command } from 'commander';
import { describeAuth } from '../../services/auth.service.js';
import { loadOAuthTokens } from '../../services/oauth.service.js';
import { resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { OAUTH_TOKENS_FILE } from '../../types/oauth.js';
import { handleError } from '../../utils/error-handler.js';
import { logger } from '../../utils/logger.js';

const LABELS = {
  'access-token': 'Access token (GACLI_ACCESS_TOKEN)',
  oauth: 'OAuth 2.0',
  'env-credentials': 'Service account (GOOGLE_APPLICATION_CREDENTIALS)',
  'config-credentials': 'Service account (config credentials)',
  adc: 'Application Default Credentials',
} as const;

export function createStatusCommand(): Command {
  return new Command('status')
    .description('Show active authentication method')
    .action((_opts: unknown, command: Command) => {
      try {
        const globals = resolveGlobalOptions(command);
        const status = collectStatus();
        if (globals.format === 'json' || globals.format === 'ndjson') {
          writeOutput(JSON.stringify(status), globals);
          return;
        }
        logger.info(`Auth method: ${LABELS[status.source]}`);
        if (status.tokenFile) logger.info(`Token file:  ${status.tokenFile}`);
        if (status.expiry)
          logger.info(
            `Expiry:      ${status.expiry}${status.expired ? ' (expired — will refresh on next use)' : ''}`,
          );
        if (status.scopes) logger.info(`Scopes:      ${status.scopes}`);
        if (status.credentialsFile) logger.info(`Credentials file: ${status.credentialsFile}`);
        if (status.credentialsFile && !status.credentialsFileExists)
          logger.warn('Credentials file does not exist.');
        if (status.source === 'adc') {
          logger.warn(
            'No gacli credentials configured; Google Application Default Credentials will be tried.',
          );
        }
      } catch (error) {
        handleError(error);
      }
    });
}

function collectStatus() {
  const { source, detail } = describeAuth();
  const status: {
    source: typeof source;
    tokenFile?: string;
    expiry?: string;
    expired?: boolean;
    scopes?: string;
    credentialsFile?: string;
    credentialsFileExists?: boolean;
  } = { source };
  if (source === 'oauth') {
    const tokens = loadOAuthTokens();
    status.tokenFile = OAUTH_TOKENS_FILE;
    if (tokens?.expiry_date) {
      status.expiry = new Date(tokens.expiry_date).toISOString();
      status.expired = tokens.expiry_date < Date.now();
    }
    if (tokens?.scope) status.scopes = tokens.scope;
  }
  if (detail) {
    status.credentialsFile = detail;
    status.credentialsFileExists = existsSync(detail);
  }
  return status;
}
