import { Command } from 'commander';
import { formatOutput } from '../../formatters/index.js';
import { describeScope, detectAll, installSkill, parseScope } from '../../services/skills.service.js';
import { type AgentName, ALL_AGENTS } from '../../services/skills-targets/index.js';
import type { InstallResult, ScopeSpec } from '../../services/skills-targets/types.js';
import { type ReportData, resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';
import { askYesNo, isInteractive } from '../../utils/interactive-prompt.js';
import { logger } from '../../utils/logger.js';
import { skillsInstallOptsSchema } from '../../validation/schemas.js';
import { validate } from '../../validation/validators.js';

export function createInstallCommand(): Command {
  return new Command('install')
    .description('Install the gacli skill into one or more AI CLI agents')
    .option('--agent <agent>', 'Target agent: claude, codex, qwen, gemini, or all')
    .option('--scope <scope>', 'Install scope: user (default), project, or a custom path', 'user')
    .option('--name <name>', 'Installed skill directory name', 'gacli')
    .option('--dry-run', 'Show what would happen without writing anything')
    .option('--force', 'Overwrite an existing install')
    .option('--no-detect', 'Skip auto-detection prompts; require --agent')
    .action(async (opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const validated = validate(skillsInstallOptsSchema, opts);
        const scope = parseScope(validated.scope);

        const agents = await resolveAgents({
          agentOpt: validated.agent,
          noDetect: validated.noDetect ?? false,
          scope,
        });

        if (!agents.length) {
          logger.warn('No target agents selected. Nothing to do.');
          process.exit(0);
        }

        const results: InstallResult[] = [];
        for (const agent of agents) {
          logger.info(`Installing for ${agent} (${describeScope(scope)})...`);
          const result = await installSkill({
            agent,
            scope,
            name: validated.name ?? 'gacli',
            force: validated.force ?? false,
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

interface ResolveAgentsParams {
  agentOpt?: 'claude' | 'codex' | 'qwen' | 'gemini' | 'all';
  noDetect: boolean;
  scope: ScopeSpec;
}

async function resolveAgents(params: ResolveAgentsParams): Promise<AgentName[]> {
  if (params.agentOpt && params.agentOpt !== 'all') {
    return [params.agentOpt];
  }
  if (params.agentOpt === 'all') {
    return ALL_AGENTS;
  }

  // No --agent flag. Auto-detect installed CLIs and ask interactively if TTY.
  if (params.noDetect) {
    logger.error('Pass --agent <claude|codex|qwen|gemini|all> when --no-detect is set.');
    process.exit(1);
  }

  const detections = await detectAll();
  const found = detections.filter((d) => d.found);

  if (!found.length) {
    logger.warn(
      'No supported AI CLI agents detected on PATH (claude, codex, qwen, gemini). Pass --agent explicitly to install anyway.',
    );
    return [];
  }

  if (!isInteractive()) {
    logger.info(
      `Detected ${found.map((f) => f.agent).join(', ')}. Installing for all (non-interactive mode).`,
    );
    return found.map((f) => f.agent);
  }

  const chosen: AgentName[] = [];
  for (const det of found) {
    const versionPart = det.version ? ` (${det.version})` : '';
    const yes = await askYesNo(`Install gacli skill for ${det.agent}${versionPart}?`, true, true);
    if (yes) chosen.push(det.agent);
  }
  return chosen;
}

function summarize(r: InstallResult): void {
  switch (r.action) {
    case 'installed':
      logger.success(`Installed ${r.agent} skill at ${r.target} (${r.fileCount} files)`);
      break;
    case 'overwritten':
      logger.success(`Overwrote ${r.agent} skill at ${r.target} (${r.fileCount} files)`);
      break;
    case 'dry-run':
      logger.info(`[dry-run] would install ${r.agent} skill at ${r.target} (${r.fileCount} files)`);
      break;
    case 'skipped':
      logger.warn(`Skipped ${r.agent}: ${r.warning ?? 'see output'}`);
      break;
  }
}

function toReportData(results: InstallResult[]): ReportData {
  return {
    headers: ['agent', 'scope', 'name', 'action', 'target', 'files', 'warning'],
    rows: results.map((r) => [
      r.agent,
      describeScope(r.scope),
      r.name,
      r.action,
      r.target,
      String(r.fileCount),
      r.warning ?? '',
    ]),
    rowCount: results.length,
  };
}
