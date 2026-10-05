import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { logger } from './logger.js';

export function ensureSecureDir(dir: string): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
}

// Write to a sibling temp file then rename, so a crash never leaves a half-written file.
// chmod after rename: `mode` only applies when a file is created.
export function writeFileAtomic(path: string, content: string, mode = 0o600): void {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, content, { encoding: 'utf-8', mode });
  renameSync(tmp, path);
  chmodSync(path, mode);
}

export function readJsonFile<T>(path: string, label: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`Ignoring corrupt ${label} at ${path}: ${msg}`);
    return null;
  }
}
