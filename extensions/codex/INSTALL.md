# Install the gacli skill into Codex CLI

**Tested against:** Codex CLI 0.121+. Skills land at the cross-vendor
`~/.agents/skills/` path (also recognized by Cursor and VS Code).

## Prerequisites

- `gacli` on PATH: `npm install -g @nalyk/gacli`.
- Authenticated to GA4: `gacli auth login` (OAuth) or
  `gacli config set credentials /path/to/sa.json`.
- Codex CLI installed: <https://developers.openai.com/codex>.

## One-line install

```bash
gacli skills install --agent codex --scope user
```

Drops the skill at `~/.agents/skills/gacli/`. Codex auto-detects new skills
on session start.

For project scope:
```bash
gacli skills install --agent codex --scope project
# → ./.agents/skills/gacli/
```

For an arbitrary directory:
```bash
gacli skills install --agent codex --scope /path/to/dir
# → /path/to/dir/.agents/skills/gacli/
```

## First interaction

In a Codex session, ask any of:

- *"What was my GA4 traffic last week by country?"* → the skill activates
  implicitly (because `policy.allow_implicit_invocation: true`) and the
  agent shells out to `gacli report run …`.
- *"List my GA4 custom dimensions."* → `gacli admin custom-dimensions list`.
- *"Audit 50 properties in parallel."* → use Codex's `spawn_agents_on_csv`
  workflow per the SKILL.md template.

Explicit invocation:
```
$gacli
```

If `gacli` is not on PATH, the skill's `dependencies.tools` declaration
surfaces a clean missing-binary error instead of letting the agent fail
mid-task.

## Manual install (without `gacli` on PATH)

```bash
mkdir -p ~/.agents/skills
cp -r "$(npm root -g)/@nalyk/gacli/extensions/codex/skills/gacli" \
  ~/.agents/skills/
mkdir -p ~/.agents/skills/gacli/references
cp "$(npm root -g)/@nalyk/gacli/extensions/_core"/*.md \
  ~/.agents/skills/gacli/references/
```

## Uninstall

```bash
gacli skills uninstall --agent codex --scope user
```

Or manually:
```bash
rm -rf ~/.agents/skills/gacli
```

## Troubleshooting

- **`$gacli` not in selector**: confirm the install path with
  `gacli skills path --agent codex` and that `~/.agents/skills/gacli/SKILL.md`
  exists. Restart Codex to refresh the catalog.
- **Skill activates but commands fail**: run `gacli auth status` and
  `gacli --version` outside Codex to verify setup. The
  `dependencies.tools` block should surface this; if not, your Codex
  version may not support `type: "binary"` yet — that's a docs issue, not
  a skill bug.
- **Marketplace branding** (icon, color): the `agents/openai.yaml`
  declares display name, GA4 orange (`#F9AB00`), and a default prompt.
  These show up in marketplace UIs that support them.
