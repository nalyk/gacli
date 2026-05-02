import { createTarget } from './base.js';

/** Gemini CLI: ~/.gemini/skills/<name>/SKILL.md (user) or .gemini/skills/ (project). */
export const geminiTarget = createTarget({
  agent: 'gemini',
  binary: 'gemini',
  userSkillsSubpath: '.gemini/skills',
  projectSkillsSubpath: '.gemini/skills',
});
