import { createRequire } from 'node:module';

// Synchronous, on-demand loading of CommonJS libraries that most commands never need.
// The single-executable build swaps this module for lazy-cjs.sea.ts (static imports), because a
// runtime require cannot be bundled.
const require = createRequire(import.meta.url);

export const loadCliTable = (): typeof import('cli-table3') => require('cli-table3');
export const loadAuthLibrary = (): typeof import('google-auth-library') => require('google-auth-library');
