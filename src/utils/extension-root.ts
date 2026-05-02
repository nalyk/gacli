import { existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

let cached: string | undefined;

/**
 * Resolves the absolute path of the bundled `extensions/` tree.
 *
 * Works in three contexts:
 *   1. `pnpm dev` (tsx) — script lives in `src/`, `extensions/` is at repo root.
 *   2. `pnpm build && pnpm start` — script lives in `dist/`, `extensions/` is one level up.
 *   3. `npm i -g @nalyk/gacli` — script lives in `<pkg>/dist/`, `extensions/` is at `<pkg>/extensions/`.
 *
 * Walks upward from `import.meta.url` looking for a directory containing
 * `extensions/_core/` (the shared knowledge spine). Throws if not found.
 *
 * Override via `GACLI_EXTENSIONS_DIR` env var (mostly for tests).
 */
export function resolveExtensionsRoot(): string {
  if (cached) return cached;

  const override = process.env.GACLI_EXTENSIONS_DIR;
  if (override) {
    const abs = resolve(override);
    if (!isExtensionsTree(abs)) {
      throw new Error(
        `GACLI_EXTENSIONS_DIR is set to "${override}" but does not look like a gacli extensions tree (missing _core/).`,
      );
    }
    cached = abs;
    return abs;
  }

  const here = fileURLToPath(import.meta.url);
  let dir = dirname(here);
  // Walk upward up to 6 levels — enough for src/, dist/, dist/utils/, etc.
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, 'extensions');
    if (isExtensionsTree(candidate)) {
      cached = candidate;
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    `Could not locate the bundled extensions/ tree. ` +
      `Walked up from ${here}. ` +
      `Set GACLI_EXTENSIONS_DIR to override.`,
  );
}

function isExtensionsTree(path: string): boolean {
  if (!existsSync(path)) return false;
  if (!statSync(path).isDirectory()) return false;
  const core = join(path, '_core');
  return existsSync(core) && statSync(core).isDirectory();
}

/** For tests: clear the cached resolution so the next call re-resolves. */
export function resetExtensionsRootCache(): void {
  cached = undefined;
}
