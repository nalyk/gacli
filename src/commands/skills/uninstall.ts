import { Command } from 'commander';
import { formatOutput } from '../../formatters/index.js';
import { describeScope, parseScope, uninstallSkill } from '../../services/skills.service.js';
import { type AgentName, ALL_AGENTS } from '../../services/skills-targets/index.js';
import type { UninstallResult } from '../../services/skills-targets/types.js';
import { type ReportData, resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';
import { logger } from '../../utils/logger.js';
import { skillsUninstallOptsSchema } from '../../validation/schemas.js';
import { validate } from '../../validation/validators.js';

export function createUninstallCommand(): Command {
  return new Command('uninstall')
    .description('Remove a previously installed gacli skill')
    .option('--agent <agent>', 'Target agent: claude, codex, qwen, gemini, or all')
    .option('--scope <scope>', 'Scope: user, project, or a custom path', 'user')
    .option('--name <name>', 'Skill directory name', 'gacli')
    .option('--all', 'Uninstall every detected gacli install across all agents and scopes')
    .option('--dry-run', 'Show what would happen without removing anything')
    .action(async (opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const validated = validate(skillsUninstallOptsSchema, opts);

        const agents: AgentName[] = validated.all
          ? ALL_AGENTS
          : validated.agent && validated.agent !== 'all'
            ? [validated.agent]
            : ALL_AGENTS;

        const scope = parseScope(validated.scope);
        const results: UninstallResult[] = [];

        for (const agent of agents) {
          const result = await uninstallSkill({
            agent,
            scope,
            name: validated.name ?? 'gacli',
            dryRun: validated.dryRun ?? false,
          });
          results.push(result);
          summarize(result);
        }

        const data = toReportData(results);
        writeOutput(formatOutput(data, globalOpts.format), globalOpts);
      } catch (error) {
        handleError(error);
      }
    });
}

function summarize(r: UninstallResult): void {
  switch (r.action) {
    case 'removed':
      logger.success(`Removed ${r.agent} skill at ${r.target}`);
      break;
    case 'not-found':
      logger.debug(`No ${r.agent} skill at ${r.target} (nothing to remove)`);
      break;
    case 'refused':
      logger.warn(`Refused ${r.agent} at ${r.target}: ${r.warning}`);
      break;
    case 'dry-run':
      logger.info(`[dry-run] would remove ${r.agent} skill at ${r.target}`);
      break;
  }
}

function toReportData(results: UninstallResult[]): ReportData {
  return {
    headers: ['agent', 'scope', 'name', 'action', 'target', 'warning'],
    rows: results.map((r) => [r.agent, describeScope(r.scope), r.name, r.action, r.target, r.warning ?? '']),
    rowCount: results.length,
  };
}
