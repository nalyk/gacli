import CliTable from 'cli-table3';
import * as authLibrary from 'google-auth-library';
import type * as lazy from './lazy-cjs.js';

// SEA variant of lazy-cjs.ts: everything must be inside the bundle (tsdown.sea.config.ts aliases it).
export const loadCliTable: typeof lazy.loadCliTable = () => CliTable;
export const loadAuthLibrary: typeof lazy.loadAuthLibrary = () => authLibrary;
