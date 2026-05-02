import { Command } from 'commander';
import { formatOutput } from '../../formatters/index.js';
import { detectAll } from '../../services/skills.service.js';
import { type ReportData, resolveGlobalOptions, writeOutput } from '../../types/common.js';
import { handleError } from '../../utils/error-handler.js';
import { skillsDoctorOptsSchema } from '../../validation/schemas.js';
import { validate } from '../../validation/validators.js';

export function createDoctorCommand(): Command {
  return new Command('doctor')
    .description('Detect installed AI CLI agents and report skill-install health')
    .action(async (opts, command) => {
      try {
        const globalOpts = resolveGlobalOptions(command);
        validate(skillsDoctorOptsSchema, opts);

        const detections = await detectAll();

        const data: ReportData = {
          headers: ['agent', 'detected', 'binary', 'version'],
          rows: detections.map((d) => [d.agent, d.found ? 'yes' : 'no', d.binary ?? '', d.version ?? '']),
          rowCount: detections.length,
        };

        writeOutput(formatOutput(data, globalOpts.format), globalOpts);
      } catch (error) {
        handleError(error);
      }
    });
}
