#!/usr/bin/env node
// Namespace import: enableCompileCache is Node >=22.1, and a missing named export would fail to link.
import * as nodeModule from 'node:module';

// Must run before the CLI module graph loads, hence the dynamic import below.
nodeModule.enableCompileCache?.();
await import('./cli.js');
