import { createTarget } from './base.js';

/** Claude Code: ~/.claude/skills/<name>/SKILL.md (user) or .claude/skills/ (project). */
export const claudeTarget = createTarget({
  agent: 'claude',
  binary: 'claude',
  userSkillsSubpath: '.claude/skills',
  projectSkillsSubpath: '.claude/skills',
});
