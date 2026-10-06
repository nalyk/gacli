import { execFileSync, spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { BIN, skipWithoutDist } from '../helpers/dist.js';

// Runs in a fresh process: the vitest worker's module cache may already hold the SDKs.
function loadedGoogleModules(entry: string): string[] {
  const script = `
    import { createRequire } from 'node:module';
    await import(${JSON.stringify(entry)});
    const req = createRequire(import.meta.url);
    console.log(JSON.stringify(Object.keys(req.cache).filter((k) => k.includes('@google-analytics'))));
  `;
  const out = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    cwd: process.cwd(),
    encoding: 'utf-8',
  });
  return JSON.parse(out.trim().split('\n').pop() ?? '[]');
}

describe('startup does not load GA SDKs', () => {
  it('importing the data service does not load @google-analytics/*', () => {
    expect(loadedGoogleModules('./src/services/data-api.service.ts')).toEqual([]);
  });

  it('importing the admin service does not load @google-analytics/*', () => {
    expect(loadedGoogleModules('./src/services/admin-api.service.ts')).toEqual([]);
  });
});

// ESM packages never appear in require.cache, so record every resolved specifier instead.
function resolvedSpecifiers(entries: string[]): string[] {
  const script = `
    import { registerHooks } from 'node:module';
    const seen = new Set();
    registerHooks({ resolve(spec, ctx, next) { seen.add(spec); return next(spec, ctx); } });
    for (const e of ${JSON.stringify(entries)}) await import(e);
    console.log(JSON.stringify([...seen]));
  `;
  const out = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    cwd: process.cwd(),
    encoding: 'utf-8',
  });
  return JSON.parse(out.trim().split('\n').pop() ?? '[]');
}

describe('startup does not load terminal UI libraries', () => {
  it('the CLI core and catalogue do not import ora or cli-table3 up front', () => {
    const seen = resolvedSpecifiers([
      './src/core/cli-adapter.ts',
      './src/operations/index.ts',
      './src/commands/explore/index.ts',
    ]);
    expect(seen.filter((s) => s === 'ora' || s === 'cli-table3')).toEqual([]);
  });
});

describe.skipIf(skipWithoutDist)('built CLI startup loads only what the command needs', () => {
  const hooks = `data:text/javascript,${encodeURIComponent(`
    import { registerHooks } from 'node:module';
    const seen = new Set();
    registerHooks({ resolve(s, c, n) { if (/^[@a-z]/.test(s) && !s.startsWith('node:')) seen.add(s.split('/').slice(0, s.startsWith('@') ? 2 : 1).join('/')); return n(s, c); } });
    process.on('exit', () => process.stderr.write('LOADED ' + [...seen].join(' ') + '\\n'));
  `)}`;
  const loaded = (args: string[]) => {
    const r = spawnSync(process.execPath, ['--import', hooks, BIN, ...args], {
      encoding: 'utf-8',
      env: { ...process.env, CLAUDECODE: '' },
    });
    return (r.stderr.match(/LOADED (.*)/)?.[1] ?? '').split(' ').filter(Boolean);
  };

  it.each([['--version'], ['--help'], ['config', '--help']])(
    '%s does not load zod or google-auth-library',
    (...args) => {
      const pkgs = loaded(args);
      expect(pkgs).not.toContain('zod');
      expect(pkgs).not.toContain('google-auth-library');
    },
  );

  it('a report command still works (loads its own dependencies)', () => {
    expect(loaded(['report', 'run', '--help'])).toContain('zod');
  });
});
