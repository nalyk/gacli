import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Replaced at build time by tsdown (`define`), so bundles and single-executable binaries need no
// package.json. Unbundled runs (tsx, vitest) read it from ../package.json instead.
declare const __GACLI_VERSION__: string | undefined;

function packageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return (JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf-8')) as { version: string }).version;
}

export const VERSION: string = typeof __GACLI_VERSION__ === 'string' ? __GACLI_VERSION__ : packageVersion();
