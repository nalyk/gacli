# Install the gacli skill into Qwen Code

**Tested against:** Qwen Code 0.6+.

## Prerequisites

- `gacli` on PATH: `npm install -g @nalyk/gacli`.
- Authenticated to GA4: `gacli auth login` (OAuth) or
  `gacli config set credentials /path/to/sa.json`.
- Qwen Code installed: <https://qwenlm.github.io/qwen-code-docs/en/>.

## One-line install

```bash
gacli skills install --agent qwen --scope user
```

Drops the skill at `~/.qwen/skills/gacli/`. Restart Qwen Code (or run
`/extensions manage`) to pick it up.

For project scope:
```bash
gacli skills install --agent qwen --scope project
# → ./.qwen/skills/gacli/
```

For an arbitrary directory:
```bash
gacli skills install --agent qwen --scope /path/to/dir
# → /path/to/dir/.qwen/skills/gacli/
```

## First interaction

In a Qwen Code session, ask any of:

- *"Audit my GA4 property."* → the skill auto-activates and the agent runs
  the multi-command admin sweep.
- *"Show me last week's GA4 traffic."* → `gacli report run -m sessions
  -d date …`.

Or invoke explicitly:
```
/skills gacli
```

## Recommended permissions config (.qwen/settings.json)

Auto-approves safe gacli reads, asks for write operations, denies
destructive ones. **Copy this verbatim** — don't ask the agent to
generate it (Qwen issue #1910):

```json
{
  "permissions": {
    "allow": [
      "Bash(gacli auth status)",
      "Bash(gacli auth login*)",
      "Bash(gacli admin * list)",
      "Bash(gacli admin * get)",
      "Bash(gacli metadata *)",
      "Bash(gacli report *)",
      "Bash(gacli audience export list)",
      "Bash(gacli audience export get*)",
      "Bash(gacli config get *)",
      "Bash(gacli config list)"
    ],
    "ask": [
      "Bash(gacli admin * create)",
      "Bash(gacli admin * update)",
      "Bash(gacli config set *)",
      "Bash(gacli audience export create*)"
    ],
    "deny": [
      "Bash(gacli admin * delete)",
      "Bash(gacli admin * archive)"
    ]
  }
}
```

## Manual install (without `gacli` on PATH)

```bash
mkdir -p ~/.qwen/skills
cp -r "$(npm root -g)/@nalyk/gacli/extensions/qwen/skills/gacli" \
  ~/.qwen/skills/
mkdir -p ~/.qwen/skills/gacli/references
cp "$(npm root -g)/@nalyk/gacli/extensions/_core"/*.md \
  ~/.qwen/skills/gacli/references/
```

## Uninstall

```bash
gacli skills uninstall --agent qwen --scope user
```

Or manually:
```bash
rm -rf ~/.qwen/skills/gacli
```

## Troubleshooting

- **Skill not in `/skills` list**: Qwen Code loads skills at session start
  only — restart your session.
- **`/skills gacli` works but auto-invoke doesn't**: front-load the user
  prompt with explicit GA4 keywords ("audit my GA4 …", "show me GA4
  traffic …").
- **Permission prompt fatigue**: copy the recommended `.qwen/settings.json`
  block above to auto-approve safe operations.
- **Cross-platform note**: This skill follows the Agent Skills standard. The
  Claude Code package (`gacli skills install --agent claude`) and Qwen
  package share the same teaching content; only the format differs slightly.
