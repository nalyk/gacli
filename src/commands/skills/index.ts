import { Command } from 'commander';
import { createDoctorCommand } from './doctor.js';
import { createInstallCommand } from './install.js';
import { createListCommand } from './list.js';
import { createPathCommand } from './path.js';
import { createUninstallCommand } from './uninstall.js';

export function createSkillsCommand(): Command {
  const cmd = new Command('skills').description(
    'Install the gacli skill into Claude Code, Codex, Qwen, or Gemini',
  );

  cmd.addCommand(createInstallCommand());
  cmd.addCommand(createUninstallCommand());
  cmd.addCommand(createListCommand());
  cmd.addCommand(createPathCommand());
  cmd.addCommand(createDoctorCommand());

  return cmd;
}
