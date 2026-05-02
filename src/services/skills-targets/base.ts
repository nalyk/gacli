import { spawn } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import type {
  AgentName,
  DetectResult,
  InstalledSkill,
  InstallOptions,
  InstallResult,
  ScopeSpec,
  SkillTarget,
  UninstallResult,
} from './types.js';

/**
 * Fixed config for a per-CLI target. Each per-target module just supplies these
 * four fields; everything else (install, uninstall, list, detect) is shared.
 */
export interface TargetConfig {
  agent: AgentName;
  /** Binary name to probe for `detect()`, e.g. 'claude'. */
  binary: string;
  /**
   * Skills directory relative to the user's home (no leading slash).
   * Example: '.claude/skills' (most CLIs) or '.agents/skills' (Codex's
   * cross-vendor path).
   */
  userSkillsSubpath: string;
  /**
   * Skills directory relative to a project root (no leading slash).
   * Example: '.claude/skills'. For Codex this is '.agents/skills'.
   */
  projectSkillsSubpath: string;
}

/** Marker dropped into every install so we can recognize what we own on uninstall. */
const MARKER_FILE = '.gacli-skill';
const MARKER_VERSION = '1';

interface MarkerPayload {
  installer: 'gacli';
  version: string;
  installedAt: string;
  agent: AgentName;
  name: string;
}

export function createTarget(config: TargetConfig): SkillTarget {
  return {
    agent: config.agent,

    async detect(): Promise<DetectResult> {
      return probeBinary(config.binary);
    },

    resolveSkillsRoot(scope: ScopeSpec): string {
      return resolveSkillsRoot(scope, config);
    },

    async install(opts: InstallOptions): Promise<InstallResult> {
      const root = resolveSkillsRoot(opts.scope, config);
      const target = join(root, opts.name);
      const exists = existsSync(target);

      if (exists && !opts.force) {
        if (!isOwnedByUs(target)) {
          return {
            agent: config.agent,
            scope: opts.scope,
            name: opts.name,
            target,
            action: 'skipped',
            fileCount: 0,
            warning: `Path exists and was not installed by gacli — refusing to overwrite. Use --force only if you know what's there.`,
          };
        }
        return {
          agent: config.agent,
          scope: opts.scope,
          name: opts.name,
          target,
          action: 'skipped',
          fileCount: 0,
          warning: 'Already installed. Pass --force to overwrite.',
        };
      }

      const fileCount = countFilesInTree(opts.sourceDir) + countFilesInDir(opts.coreDir, /\.md$/);

      if (opts.dryRun) {
        return {
          agent: config.agent,
          scope: opts.scope,
          name: opts.name,
          target,
          action: 'dry-run',
          fileCount,
        };
      }

      // Atomic-ish: write to a sibling temp dir, then rename into place.
      mkdirSync(root, { recursive: true });
      const tmp = `${target}.gacli-tmp-${process.pid}-${Date.now()}`;
      try {
        cpSync(opts.sourceDir, tmp, { recursive: true });
        const refsDir = join(tmp, 'references');
        mkdirSync(refsDir, { recursive: true });
        for (const entry of readdirSync(opts.coreDir)) {
          if (!entry.endsWith('.md')) continue;
          cpSync(join(opts.coreDir, entry), join(refsDir, entry));
        }
        writeMarker(tmp, config.agent, opts.name);

        if (exists) {
          // We confirmed it's ours above (or --force was passed); replace it.
          rmSync(target, { recursive: true, force: true });
        }
        renameWithCrossDeviceFallback(tmp, target);
      } catch (err) {
        // Cleanup temp on failure
        if (existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
        throw err;
      }

      return {
        agent: config.agent,
        scope: opts.scope,
        name: opts.name,
        target,
        action: exists ? 'overwritten' : 'installed',
        fileCount,
      };
    },

    async uninstall(opts: { scope: ScopeSpec; name: string; dryRun: boolean }): Promise<UninstallResult> {
      const root = resolveSkillsRoot(opts.scope, config);
      const target = join(root, opts.name);

      if (!existsSync(target)) {
        return {
          agent: config.agent,
          scope: opts.scope,
          name: opts.name,
          target,
          action: 'not-found',
        };
      }

      if (!isOwnedByUs(target)) {
        return {
          agent: config.agent,
          scope: opts.scope,
          name: opts.name,
          target,
          action: 'refused',
          warning: `Path exists but was not installed by gacli (no ${MARKER_FILE} marker). Refusing to delete.`,
        };
      }

      if (opts.dryRun) {
        return {
          agent: config.agent,
          scope: opts.scope,
          name: opts.name,
          target,
          action: 'dry-run',
        };
      }

      rmSync(target, { recursive: true, force: true });
      return {
        agent: config.agent,
        scope: opts.scope,
        name: opts.name,
        target,
        action: 'removed',
      };
    },

    async listInstalled(scopes: ScopeSpec[]): Promise<InstalledSkill[]> {
      const out: InstalledSkill[] = [];
      for (const scope of scopes) {
        const root = resolveSkillsRoot(scope, config);
        if (!existsSync(root)) continue;
        for (const entry of readdirSync(root)) {
          const path = join(root, entry);
          if (!statSync(path).isDirectory()) continue;
          if (!isOwnedByUs(path)) continue;
          out.push({ name: entry, path, scope });
        }
      }
      return out;
    },
  };
}

function resolveSkillsRoot(scope: ScopeSpec, config: TargetConfig): string {
  switch (scope.kind) {
    case 'user':
      return join(homedir(), config.userSkillsSubpath);
    case 'project':
      return join(scope.dir ?? process.cwd(), config.projectSkillsSubpath);
    case 'path': {
      if (!scope.dir) {
        throw new Error('Scope kind "path" requires `dir`.');
      }
      return join(resolve(scope.dir), config.projectSkillsSubpath);
    }
  }
}

function writeMarker(dir: string, agent: AgentName, name: string): void {
  const payload: MarkerPayload = {
    installer: 'gacli',
    version: MARKER_VERSION,
    installedAt: new Date().toISOString(),
    agent,
    name,
  };
  writeFileSync(join(dir, MARKER_FILE), `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
}

function isOwnedByUs(dir: string): boolean {
  const marker = join(dir, MARKER_FILE);
  if (!existsSync(marker)) return false;
  try {
    const data = JSON.parse(readFileSync(marker, 'utf-8')) as MarkerPayload;
    return data.installer === 'gacli';
  } catch {
    return false;
  }
}

function countFilesInTree(root: string): number {
  let count = 0;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      count += countFilesInTree(path);
    } else if (entry.isFile()) {
      count += 1;
    }
  }
  return count;
}

function countFilesInDir(dir: string, pattern: RegExp): number {
  let count = 0;
  for (const entry of readdirSync(dir)) {
    if (pattern.test(entry)) count += 1;
  }
  return count;
}

/**
 * Probe a binary by name + `--version`. Quick (1.5s timeout) and tolerant —
 * any non-zero exit or missing binary returns `{ found: false }`.
 */
async function probeBinary(binary: string): Promise<DetectResult> {
  return new Promise((resolveProbe) => {
    const child = spawn(binary, ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        child.kill('SIGKILL');
      } catch {
        /* ignore */
      }
      resolveProbe({ found: false });
    }, 1500);

    child.stdout?.on('data', (chunk: Buffer) => {
      out += chunk.toString();
    });
    child.on('error', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolveProbe({ found: false });
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (code === 0) {
        const version = out.trim().split('\n')[0]?.trim() || undefined;
        resolveProbe({ found: true, version, binary });
      } else {
        resolveProbe({ found: false });
      }
    });
  });
}

/**
 * fs.renameSync, falling back to copy-then-remove when the temp lives on a
 * different filesystem (EXDEV).
 */
function renameWithCrossDeviceFallback(from: string, to: string): void {
  try {
    renameSync(from, to);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'EXDEV') {
      cpSync(from, to, { recursive: true });
      rmSync(from, { recursive: true, force: true });
    } else {
      throw err;
    }
  }
}
