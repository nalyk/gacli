import { Command } from 'commander';
import { formatOutput } from '../../formatters/index.js';
import { describeScope, listAllInstalls } from '../../services/skills.service.js';
import type { ScopeSpec } from '../../services/skills-targets/types.js';
import { type ReportData, resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';
import { skillsListOptsSchema } from '../../validation/schemas.js';
import { validate } from '../../validation/validators.js';

export function createListCommand(): Command {
  return new Command('list')
    .description('List gacli skills installed across detected AI CLI scopes')
    .action(async (opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        validate(skillsListOptsSchema, opts);

        const scopes: ScopeSpec[] = [{ kind: 'user' }, { kind: 'project', dir: process.cwd() }];
        const installs = await listAllInstalls(scopes);

        const data: ReportData = {
          headers: ['agent', 'scope', 'name', 'path'],
          rows: installs.map((i) => [i.agent, describeScope(i.scope), i.name, i.path]),
          rowCount: installs.length,
        };

        writeOutput(formatOutput(data, globalOpts.format), globalOpts);
      } catch (error) {
        handleError(error);
      }
    });
}
