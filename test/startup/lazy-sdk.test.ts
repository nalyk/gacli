import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

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
