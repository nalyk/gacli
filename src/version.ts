import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Read from package.json at runtime; in dev (tsx src/) and prod (dist/) it sits at ../.
// Phase 5 replaces this with a build-time define so bundles/SEA binaries work.
export const VERSION: string = (() => {
  const here = dirname(fileURLToPath(import.meta.url));
  const { version } = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf-8')) as {
    version: string;
  };
  return version;
})();
