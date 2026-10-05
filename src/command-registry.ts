import type { Command } from 'commander';

// Top-level commands are registered as cheap stubs (name + description) so `--version` and root
// `--help` never load zod, the operation catalogue or the auth library. Only the command the user
// actually invoked is imported (test/cli/command-registry.test.ts keeps these descriptions honest).
export interface LazyCommand {
  description: string;
  /** Operation groups are filled by mountOperations; hand-written commands replace their stub. */
  load: 'operations' | (() => Promise<Command>);
}

const ops = (description: string): LazyCommand => ({ description, load: 'operations' });

export const LAZY_COMMANDS: Record<string, LazyCommand> = {
  report: ops('Google Analytics 4 Data API reporting commands'),
  metadata: ops('GA4 metadata operations (dimensions, metrics, compatibility)'),
  audience: ops('Audience export and recurring audience operations'),
  admin: ops('GA4 Admin API operations'),
  config: {
    description: 'Manage CLI configuration',
    load: async () => (await import('./commands/config/index.js')).createConfigCommand(),
  },
  auth: {
    description: 'Manage authentication',
    load: async () => (await import('./commands/auth/index.js')).createAuthCommand(),
  },
  explore: {
    description: 'Interactive REPL to browse GA4 metrics and dimensions for a property',
    load: async () => (await import('./commands/explore/index.js')).createExploreCommand(),
  },
  mcp: {
    description: 'Model Context Protocol server',
    load: async () => (await import('./commands/mcp/index.js')).createMcpCommand(),
  },
  skills: {
    description: 'Install the gacli skill into Claude Code, Codex, Qwen, or Gemini',
    load: async () => (await import('./commands/skills/index.js')).createSkillsCommand(),
  },
  schema: {
    description: 'Describe operations as JSON (flags, input/output JSON Schema) for scripts and AI agents',
    load: async () => {
      const [{ createSchemaCommand }, { OPERATIONS }] = await Promise.all([
        import('./commands/schema/index.js'),
        import('./operations/index.js'),
      ]);
      return createSchemaCommand(OPERATIONS);
    },
  },
  api: {
    description:
      'Call any GA4 Admin/Data RPC directly (escape hatch for methods without a dedicated command)',
    load: async () => (await import('./commands/api/index.js')).createApiCommand(),
  },
};

const VALUE_OPTIONS = new Set(['-p', '--property', '-f', '--format', '-o', '--output']);

/** First command word in argv, skipping global options (and `help <cmd>`). */
export function targetCommand(args: string[]): string | undefined {
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (VALUE_OPTIONS.has(a)) {
      i++;
      continue;
    }
    if (a.startsWith('-')) continue;
    return a === 'help' ? targetCommand(args.slice(i + 1)) : a;
  }
  return undefined;
}
