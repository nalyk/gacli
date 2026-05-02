import { Command } from 'commander';
import { formatOutput } from '../../formatters/index.js';
import { describeScope, parseScope } from '../../services/skills.service.js';
import { getTarget } from '../../services/skills-targets/index.js';
import { type ReportData, resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';
import { skillsPathOptsSchema } from '../../validation/schemas.js';
import { validate } from '../../validation/validators.js';

export function createPathCommand(): Command {
  return new Command('path')
    .description('Print the install path gacli would use for a given agent + scope')
    .requiredOption('--agent <agent>', 'Target agent: claude, codex, qwen, gemini')
    .option('--scope <scope>', 'Scope: user, project, or a custom path', 'user')
    .action(async (opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        const validated = validate(skillsPathOptsSchema, opts);
        const scope = parseScope(validated.scope);
        const target = getTarget(validated.agent);
        const path = target.resolveSkillsRoot(scope);

        const data: ReportData = {
          headers: ['agent', 'scope', 'skills_root'],
          rows: [[validated.agent, describeScope(scope), path]],
          rowCount: 1,
        };

        writeOutput(formatOutput(data, globalOpts.format), globalOpts);
      } catch (error) {
        handleError(error);
      }
    });
}
