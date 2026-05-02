export type AgentName = 'claude' | 'codex' | 'qwen' | 'gemini';

export type ScopeKind = 'user' | 'project' | 'path';

export interface ScopeSpec {
  kind: ScopeKind;
  /** For `kind: 'project'`, the project root (defaults to cwd). For `kind: 'path'`, the absolute path. */
  dir?: string;
}

export interface DetectResult {
  found: boolean;
  version?: string;
  binary?: string;
}

export interface InstallOptions {
  /** Absolute path to the per-CLI source tree (e.g. <extensions-root>/claude-code/skills/gacli/). */
  sourceDir: string;
  /** Absolute path to the shared knowledge spine (<extensions-root>/_core/). */
  coreDir: string;
  scope: ScopeSpec;
  /** Skill directory name at the destination (default 'gacli'). */
  name: string;
  force: boolean;
  dryRun: boolean;
}

export interface InstalledSkill {
  /** Skill directory name (e.g. 'gacli'). */
  name: string;
  /** Absolute path of the installed skill directory. */
  path: string;
  /** Scope this install lives in. */
  scope: ScopeSpec;
}

export interface InstallResult {
  agent: AgentName;
  scope: ScopeSpec;
  name: string;
  /** Absolute target path (where the skill landed). */
  target: string;
  /** What happened. */
  action: 'installed' | 'overwritten' | 'skipped' | 'dry-run';
  /** Files written (or that would be, in dry-run). */
  fileCount: number;
  /** Optional warning surfaced to the user. */
  warning?: string;
}

export interface UninstallResult {
  agent: AgentName;
  scope: ScopeSpec;
  name: string;
  target: string;
  action: 'removed' | 'not-found' | 'refused' | 'dry-run';
  warning?: string;
}

export interface SkillTarget {
  readonly agent: AgentName;
  /** Probe whether the target CLI is installed. Used by `gacli skills doctor`. */
  detect(): Promise<DetectResult>;
  /** Resolve the absolute path of the skills root for a given scope. */
  resolveSkillsRoot(scope: ScopeSpec): string;
  /** Install the per-CLI skill bundle into the resolved scope. */
  install(opts: InstallOptions): Promise<InstallResult>;
  /** Remove a previously installed skill. */
  uninstall(opts: { scope: ScopeSpec; name: string; dryRun: boolean }): Promise<UninstallResult>;
  /** List skills currently installed under any of the given scopes. */
  listInstalled(scopes: ScopeSpec[]): Promise<InstalledSkill[]>;
}
