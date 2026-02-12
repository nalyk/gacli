import { Command } from 'commander';
import { createAccountsCommand } from './accounts.js';
import { createPropertiesCommand } from './properties.js';
import { createDataStreamsCommand } from './datastreams.js';
import { createCustomDimensionsCommand } from './custom-dimensions.js';
import { createCustomMetricsCommand } from './custom-metrics.js';
import { createKeyEventsCommand } from './key-events.js';
import { createAudiencesCommand } from './audiences.js';
import { createAccessBindingsCommand } from './access-bindings.js';
import { createFirebaseLinksCommand } from './firebase-links.js';
import { createGoogleAdsLinksCommand } from './google-ads-links.js';
import { createBigQueryLinksCommand } from './bigquery-links.js';

export function createAdminCommand(): Command {
  const cmd = new Command('admin').description('GA4 Admin API operations');

  cmd.addCommand(createAccountsCommand());
  cmd.addCommand(createPropertiesCommand());
  cmd.addCommand(createDataStreamsCommand());
  cmd.addCommand(createCustomDimensionsCommand());
  cmd.addCommand(createCustomMetricsCommand());
  cmd.addCommand(createKeyEventsCommand());
  cmd.addCommand(createAudiencesCommand());
  cmd.addCommand(createAccessBindingsCommand());
  cmd.addCommand(createFirebaseLinksCommand());
  cmd.addCommand(createGoogleAdsLinksCommand());
  cmd.addCommand(createBigQueryLinksCommand());

  return cmd;
}
