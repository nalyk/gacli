import { createTarget } from './base.js';

/** Qwen Code: ~/.qwen/skills/<name>/SKILL.md (user) or .qwen/skills/ (project). */
export const qwenTarget = createTarget({
  agent: 'qwen',
  binary: 'qwen',
  userSkillsSubpath: '.qwen/skills',
  projectSkillsSubpath: '.qwen/skills',
});
