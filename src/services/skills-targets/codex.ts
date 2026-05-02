import { createTarget } from './base.js';

/**
 * Codex CLI uses the cross-vendor Agent Skills standard path:
 * `~/.agents/skills/<name>/SKILL.md` (user) or `.agents/skills/` (project).
 *
 * Per developers.openai.com/codex/skills, this is intentional — the path is
 * shared with Cursor and VS Code so a skill can serve all three.
 */
export const codexTarget = createTarget({
  agent: 'codex',
  binary: 'codex',
  userSkillsSubpath: '.agents/skills',
  projectSkillsSubpath: '.agents/skills',
});
