import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsdown';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8')) as { version: string; dependencies: Record<string, string> };

// Only our own src/ is bundled (one module graph instead of ~150 files to resolve at startup).
// Every runtime dependency stays external so installs dedupe and the GA SDKs load as published.
export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  dts: false,
  sourcemap: false,
  fixedExtension: false,
  external: [...Object.keys(pkg.dependencies).map((name) => new RegExp(`^${name}(/|$)`)), /^node:/],
  define: { __GACLI_VERSION__: JSON.stringify(pkg.version) },
});
