import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installSkill, listAllInstalls, uninstallSkill } from '../../src/services/skills.service.js';
import { resetExtensionsRootCache } from '../../src/utils/extension-root.js';

let workDir: string;
let extDir: string;

function makeFakeExtensions(root: string): void {
  // Minimal fake extensions/ tree: _core/ + one file per CLI package.
  mkdirSync(join(root, '_core'), { recursive: true });
  writeFileSync(join(root, '_core', 'recipes.md'), '# recipes\n', 'utf-8');
  writeFileSync(join(root, '_core', 'pitfalls.md'), '# pitfalls\n', 'utf-8');

  for (const cli of ['claude-code', 'codex', 'qwen', 'gemini']) {
    const skillDir = join(root, cli, 'skills', 'gacli');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      `---\nname: gacli\ndescription: GA4 test skill for ${cli}\n---\nbody`,
      'utf-8',
    );
  }
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'gacli-skills-test-'));
  extDir = join(workDir, 'extensions');
  makeFakeExtensions(extDir);
  process.env.GACLI_EXTENSIONS_DIR = extDir;
  resetExtensionsRootCache();
});

afterEach(() => {
  delete process.env.GACLI_EXTENSIONS_DIR;
  resetExtensionsRootCache();
  rmSync(workDir, { recursive: true, force: true });
});

describe('installSkill', () => {
  it('drops the per-CLI tree + _core references, plus the .gacli-skill marker', async () => {
    const dest = join(workDir, 'dest');
    const result = await installSkill({
      agent: 'claude',
      scope: { kind: 'path', dir: dest },
      name: 'gacli',
      force: false,
      dryRun: false,
    });
    expect(result.action).toBe('installed');
    expect(existsSync(join(dest, '.claude/skills/gacli/SKILL.md'))).toBe(true);
    expect(existsSync(join(dest, '.claude/skills/gacli/.gacli-skill'))).toBe(true);
    expect(existsSync(join(dest, '.claude/skills/gacli/references/recipes.md'))).toBe(true);
    expect(existsSync(join(dest, '.claude/skills/gacli/references/pitfalls.md'))).toBe(true);
  });

  it('--dry-run writes nothing', async () => {
    const dest = join(workDir, 'dest');
    const result = await installSkill({
      agent: 'codex',
      scope: { kind: 'path', dir: dest },
      name: 'gacli',
      force: false,
      dryRun: true,
    });
    expect(result.action).toBe('dry-run');
    expect(existsSync(join(dest, '.agents/skills/gacli'))).toBe(false);
  });

  it('refuses to overwrite without --force', async () => {
    const dest = join(workDir, 'dest');
    await installSkill({
      agent: 'qwen',
      scope: { kind: 'path', dir: dest },
      name: 'gacli',
      force: false,
      dryRun: false,
    });
    const second = await installSkill({
      agent: 'qwen',
      scope: { kind: 'path', dir: dest },
      name: 'gacli',
      force: false,
      dryRun: false,
    });
    expect(second.action).toBe('skipped');
    expect(second.warning).toMatch(/--force/);
  });

  it('overwrites with --force when destination is ours', async () => {
    const dest = join(workDir, 'dest');
    await installSkill({
      agent: 'gemini',
      scope: { kind: 'path', dir: dest },
      name: 'gacli',
      force: false,
      dryRun: false,
    });
    const second = await installSkill({
      agent: 'gemini',
      scope: { kind: 'path', dir: dest },
      name: 'gacli',
      force: true,
      dryRun: false,
    });
    expect(second.action).toBe('overwritten');
  });

  it('uses .agents/skills (not .codex/skills) for codex — cross-vendor path', async () => {
    const dest = join(workDir, 'dest');
    const result = await installSkill({
      agent: 'codex',
      scope: { kind: 'path', dir: dest },
      name: 'gacli',
      force: false,
      dryRun: false,
    });
    expect(result.target).toContain('.agents/skills');
    expect(result.target).not.toContain('.codex/skills');
  });
});

describe('uninstallSkill', () => {
  it('removes a previously installed skill', async () => {
    const dest = join(workDir, 'dest');
    await installSkill({
      agent: 'claude',
      scope: { kind: 'path', dir: dest },
      name: 'gacli',
      force: false,
      dryRun: false,
    });
    const result = await uninstallSkill({
      agent: 'claude',
      scope: { kind: 'path', dir: dest },
      name: 'gacli',
      dryRun: false,
    });
    expect(result.action).toBe('removed');
    expect(existsSync(join(dest, '.claude/skills/gacli'))).toBe(false);
  });

  it('reports not-found when nothing to remove', async () => {
    const dest = join(workDir, 'dest');
    const result = await uninstallSkill({
      agent: 'claude',
      scope: { kind: 'path', dir: dest },
      name: 'gacli',
      dryRun: false,
    });
    expect(result.action).toBe('not-found');
  });

  it('refuses to remove a directory we do NOT own (no .gacli-skill marker)', async () => {
    const dest = join(workDir, 'dest');
    const stranger = join(dest, '.claude/skills/gacli');
    mkdirSync(stranger, { recursive: true });
    writeFileSync(join(stranger, 'SKILL.md'), 'not ours', 'utf-8');
    // No .gacli-skill marker.
    const result = await uninstallSkill({
      agent: 'claude',
      scope: { kind: 'path', dir: dest },
      name: 'gacli',
      dryRun: false,
    });
    expect(result.action).toBe('refused');
    expect(existsSync(join(stranger, 'SKILL.md'))).toBe(true);
  });
});

describe('listAllInstalls', () => {
  it('discovers installs we own across multiple agents in one scope', async () => {
    const dest = join(workDir, 'dest');
    await installSkill({
      agent: 'claude',
      scope: { kind: 'path', dir: dest },
      name: 'gacli',
      force: false,
      dryRun: false,
    });
    await installSkill({
      agent: 'qwen',
      scope: { kind: 'path', dir: dest },
      name: 'gacli',
      force: false,
      dryRun: false,
    });
    const found = await listAllInstalls([{ kind: 'path', dir: dest }]);
    const agents = found.map((f) => f.agent).sort();
    expect(agents).toEqual(['claude', 'qwen']);
  });

  it('skips directories without our marker', async () => {
    const dest = join(workDir, 'dest');
    const stranger = join(dest, '.claude/skills/some-other-skill');
    mkdirSync(stranger, { recursive: true });
    writeFileSync(join(stranger, 'SKILL.md'), 'not ours', 'utf-8');
    const found = await listAllInstalls([{ kind: 'path', dir: dest }]);
    expect(found).toEqual([]);
  });
});

describe('marker integrity', () => {
  it('writes a JSON marker with installer + agent + name', async () => {
    const dest = join(workDir, 'dest');
    await installSkill({
      agent: 'gemini',
      scope: { kind: 'path', dir: dest },
      name: 'gacli',
      force: false,
      dryRun: false,
    });
    const markerPath = join(dest, '.gemini/skills/gacli/.gacli-skill');
    const marker = JSON.parse(readFileSync(markerPath, 'utf-8'));
    expect(marker.installer).toBe('gacli');
    expect(marker.agent).toBe('gemini');
    expect(marker.name).toBe('gacli');
  });
});
