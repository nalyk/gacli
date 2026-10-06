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

/**
 * First command word in argv. commander parses the global options (clusters like `-vp 123`,
 * `--format=json`, `-p123`), so a flag's value is never mistaken for the command; `help <cmd>`
 * resolves to <cmd>. `parser` must carry the global options and no subcommands.
 */
export function targetCommand(parser: Command, args: string[]): string | undefined {
  const { operands } = parser.parseOptions(args);
  return operands[0] === 'help' ? operands[1] : operands[0];
}
