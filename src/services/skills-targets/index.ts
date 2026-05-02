import { claudeTarget } from './claude.js';
import { codexTarget } from './codex.js';
import { geminiTarget } from './gemini.js';
import { qwenTarget } from './qwen.js';
import type { AgentName, SkillTarget } from './types.js';

export const targets: Record<AgentName, SkillTarget> = {
  claude: claudeTarget,
  codex: codexTarget,
  qwen: qwenTarget,
  gemini: geminiTarget,
};

export const ALL_AGENTS: AgentName[] = ['claude', 'codex', 'qwen', 'gemini'];

export function getTarget(agent: AgentName): SkillTarget {
  return targets[agent];
}

export type { AgentName, SkillTarget };
