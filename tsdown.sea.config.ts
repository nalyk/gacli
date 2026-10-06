import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'tsdown';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8')) as { version: string };

// Experimental single-executable build: everything (including the GA SDKs) in one ESM file for
// `node --build-sea` (Node >= 25.5). See .github/workflows/sea.yml.
export default defineConfig({
  entry: { gacli: 'src/index.ts' },
  format: 'esm',
  platform: 'node',
  target: 'node26',
  outDir: 'dist-sea',
  clean: true,
  dts: false,
  fixedExtension: false,
  noExternal: [/.*/],
  define: { __GACLI_VERSION__: JSON.stringify(pkg.version) },
  outputOptions: { inlineDynamicImports: true },
  plugins: [
    {
      // Runtime require()s are not bundled: use the static-import variant of the lazy loaders.
      name: 'gacli-sea-static-cjs',
      resolveId(source: string) {
        return source.endsWith('/lazy-cjs.js') ? resolve('src/utils/lazy-cjs.sea.ts') : null;
      },
    },
  ],
});
