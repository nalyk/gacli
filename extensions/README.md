# gacli skills — AI assistant integration

`gacli` ships a single conceptual skill ("the gacli skill") packaged 4 ways
for the 4 supported AI coding CLIs. The teaching content is the same; only
the wrapping is format-adapted to each CLI's spec.

After `npm install -g @nalyk/gacli`, deploy the skill into your CLI of
choice in one command:

```bash
gacli skills install --agent <claude|codex|qwen|gemini|all> --scope user
```

## Install matrix

| Agent | Install path (user scope) | One-line install |
|---|---|---|
| **Claude Code** | `~/.claude/skills/gacli/` | `gacli skills install --agent claude` |
| **Codex CLI** | `~/.agents/skills/gacli/` (cross-vendor path) | `gacli skills install --agent codex` |
| **Qwen Code** | `~/.qwen/skills/gacli/` | `gacli skills install --agent qwen` |
| **Gemini CLI** | `~/.gemini/skills/gacli/` | `gacli skills install --agent gemini` |

`--scope project` installs into the current directory's CLI dir (e.g.
`./.claude/skills/gacli/`). `--scope <path>` targets an arbitrary directory.

For interactive auto-detection, omit `--agent`:
```bash
gacli skills install
# → detects which CLIs are on PATH and prompts per-CLI
```

For a one-shot install across every detected CLI:
```bash
gacli skills install --agent all
```

## Per-CLI install guides

Detailed prerequisites, first-interaction tests, and troubleshooting per CLI:

- [Claude Code](claude-code/INSTALL.md)
- [Codex CLI](codex/INSTALL.md)
- [Qwen Code](qwen/INSTALL.md)
- [Gemini CLI](gemini/INSTALL.md)

## Which CLI for which user?

- **Claude Code** — richest skill format (frontmatter glob targeting,
  pre-approved tool patterns, dynamic shell injection at skill load,
  skill-scoped hooks). Best if you live in Claude Code.
- **Codex CLI** — declarative `dependencies.tools` so missing-binary
  errors are clean; marketplace-ready branding; `spawn_agents_on_csv`
  pattern for parallel property work; cross-vendor skill path that also
  works in Cursor and VS Code.
- **Qwen Code** — minimal-but-effective spec, conventional supporting
  files (`reference.md`, `examples.md`), 12 hook events for advanced
  permission/retry orchestration. Best for Alibaba / Qwen-model users.
- **Gemini CLI** — deterministic-tooling philosophy: bundled shell
  scripts produce predictable outputs the agent orchestrates. Best if
  you value reproducibility and cron / CI workflows.

All four packages teach the same gacli expertise: the property-resolution
pre-flight, the 7 report types, the 10 admin sub-domains, the 8-operator
filter shorthand, output-format selection, and the 15 footguns. Pick the
CLI you already use.

## Verify

After installing, check what's on disk:
```bash
gacli skills list
```

And probe which target CLIs are detected:
```bash
gacli skills doctor
```

## Uninstall

```bash
gacli skills uninstall --agent <name> --scope user
```

Or `--all` to remove every detected gacli install across every agent:
```bash
gacli skills uninstall --all
```

## Manual install (without `gacli` on PATH)

The bundled `extensions/` tree ships in the npm tarball. After
`npm install -g @nalyk/gacli`, it lives at
`$(npm root -g)/@nalyk/gacli/extensions/`. Each per-CLI INSTALL.md
documents the manual `cp` invocation if you prefer that to running the
gacli command.

## Standard

The skills follow the [Agent Skills](https://agentskills.io) open standard
(directory + `SKILL.md` with YAML frontmatter). Each per-CLI package adds
the CLI's specific format extensions (e.g. Codex's `agents/openai.yaml`,
Gemini's `scripts/`).
