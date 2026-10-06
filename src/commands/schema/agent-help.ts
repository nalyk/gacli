export const AGENT_HELP = [
  '[agent mode] Machine-readable usage:',
  '  gacli schema [command...]   JSON catalogue: every operation, its flags, input/output JSON Schema',
  '  -f json|ndjson, --fields a,b.c   structured output (json is the default when piped)',
  '  exit codes: 0 ok, 1 api, 2 usage, 3 auth, 4 needs --yes, 5 not found, 6 quota',
  '',
].join('\n');
