#!/usr/bin/env node
// Dump `--help` for every leaf command of the built CLI into <outDir>/<path_joined_by_underscore>.txt.
// Used to snapshot the 1.x flag surface so later refactors can prove no flag was dropped.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.argv[2] ?? 'test/fixtures/help';
const BIN = 'dist/index.js';

function help(path) {
  return execFileSync(process.execPath, [BIN, ...path, '--help'], {
    encoding: 'utf-8',
    env: { ...process.env, NO_COLOR: '1', CLAUDECODE: '', CODEX_THREAD_ID: '', AI_AGENT: '', GACLI_AGENT: '' },
  });
}

function subcommands(text) {
  const idx = text.indexOf('\nCommands:\n');
  if (idx === -1) return [];
  return text
    .slice(idx + 11)
    .split('\n')
    .filter((l) => /^ {2}\S/.test(l))
    .map((l) => l.trim().split(/\s+/)[0])
    .filter((name) => name !== 'help');
}

function walk(path) {
  const text = help(path);
  const subs = subcommands(text);
  if (path.length > 0 && subs.length === 0) {
    writeFileSync(join(outDir, `${path.join('_')}.txt`), text);
    return 1;
  }
  return subs.reduce((n, s) => n + walk([...path, s]), 0);
}

mkdirSync(outDir, { recursive: true });
console.error(`wrote ${walk([])} help files to ${outDir}`);
