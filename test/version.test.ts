import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VERSION } from '../src/version.js';

describe('VERSION', () => {
  it('falls back to package.json when no build-time define is present', () => {
    expect(VERSION).toBe(JSON.parse(readFileSync('package.json', 'utf-8')).version);
  });
});
