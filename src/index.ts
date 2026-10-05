#!/usr/bin/env node
import { enableCompileCache } from 'node:module';

// Must run before the CLI module graph loads, hence the dynamic import below.
enableCompileCache?.();
await import('./cli.js');
