// Detects when gacli is driven by an AI agent or CI, so output defaults to machine-readable
// JSON and nothing ever waits on an interactive prompt.
const AGENT_VARS: [string, (v: string) => string][] = [
  ['GACLI_AGENT', (v) => v],
  ['CLAUDECODE', () => 'claude-code'],
  ['CODEX_THREAD_ID', () => 'codex'],
  ['CURSOR_AGENT', () => 'cursor'],
  ['AI_AGENT', (v) => v],
];

export function detectAgent(env: NodeJS.ProcessEnv = process.env): string | undefined {
  for (const [name, label] of AGENT_VARS) {
    const v = env[name];
    if (v) return label(v);
  }
  return undefined;
}

export function isCI(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!env.CI && env.CI !== 'false' && env.CI !== '0';
}

export function isInteractive(): boolean {
  return !!process.stdin.isTTY && !!process.stdout.isTTY && !isCI() && !detectAgent();
}
