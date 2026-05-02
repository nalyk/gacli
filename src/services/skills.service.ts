import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolveExtensionsRoot } from '../utils/extension-root.js';
import { type AgentName, ALL_AGENTS, getTarget } from './skills-targets/index.js';
import type {
  DetectResult,
  InstalledSkill,
  InstallResult,
  ScopeSpec,
  UninstallResult,
} from './skills-targets/types.js';

/** Map an agent name to its bundled package directory under extensions/. */
const PACKAGE_DIR: Record<AgentName, string> = {
  claude: 'claude-code',
  codex: 'codex',
  qwen: 'qwen',
  gemini: 'gemini',
};

export interface InstallParams {
  agent: AgentName;
  scope: ScopeSpec;
  name: string;
  force: boolean;
  dryRun: boolean;
}

export interface UninstallParams {
  agent: AgentName;
  scope: ScopeSpec;
  name: string;
  dryRun: boolean;
}

export async function installSkill(params: InstallParams): Promise<InstallResult> {
  const root = resolveExtensionsRoot();
  const sourceDir = join(root, PACKAGE_DIR[params.agent], 'skills', 'gacli');
  const coreDir = join(root, '_core');

  if (!existsSync(sourceDir)) {
    throw new Error(`Bundled skill source not found at ${sourceDir}. The npm install may be incomplete.`);
  }
  if (!existsSync(coreDir)) {
    throw new Error(`Shared knowledge spine not found at ${coreDir}. The npm install may be incomplete.`);
  }

  const target = getTarget(params.agent);
  return target.install({
    sourceDir,
    coreDir,
    scope: params.scope,
    name: params.name,
    force: params.force,
    dryRun: params.dryRun,
  });
}

export async function uninstallSkill(params: UninstallParams): Promise<UninstallResult> {
  const target = getTarget(params.agent);
  return target.uninstall({
    scope: params.scope,
    name: params.name,
    dryRun: params.dryRun,
  });
}

export async function listAllInstalls(
  scopes: ScopeSpec[],
): Promise<Array<InstalledSkill & { agent: AgentName }>> {
  const out: Array<InstalledSkill & { agent: AgentName }> = [];
  for (const agent of ALL_AGENTS) {
    const target = getTarget(agent);
    const installs = await target.listInstalled(scopes);
    for (const inst of installs) {
      out.push({ ...inst, agent });
    }
  }
  return out;
}

export async function detectAll(): Promise<Array<{ agent: AgentName } & DetectResult>> {
  const out: Array<{ agent: AgentName } & DetectResult> = [];
  for (const agent of ALL_AGENTS) {
    const result = await getTarget(agent).detect();
    out.push({ agent, ...result });
  }
  return out;
}

/** Convenience: parse the standard --scope value into a ScopeSpec. */
export function parseScope(value: string | undefined): ScopeSpec {
  if (!value || value === 'user') return { kind: 'user' };
  if (value === 'project') return { kind: 'project', dir: process.cwd() };
  // Anything else is treated as a custom path.
  return { kind: 'path', dir: value };
}

export function describeScope(scope: ScopeSpec): string {
  switch (scope.kind) {
    case 'user':
      return 'user';
    case 'project':
      return 'project';
    case 'path':
      return scope.dir ?? 'path';
  }
}
