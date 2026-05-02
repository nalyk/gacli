# Install the gacli skill into Claude Code

**Tested against:** Claude Code ≥ 1.0.

## Prerequisites

- `gacli` on PATH: `npm install -g @nalyk/gacli` (or `pnpm add -g @nalyk/gacli`).
- Authenticated to GA4: `gacli auth login` (OAuth) or
  `gacli config set credentials /path/to/sa.json` (service account).
- Claude Code installed: <https://docs.claude.com/en/docs/claude-code>.

## One-line install

```bash
gacli skills install --agent claude --scope user
```

This drops the bundled skill at `~/.claude/skills/gacli/`. Claude Code's live
discovery picks it up immediately — no restart required.

For project scope (skill only available in this repo):
```bash
gacli skills install --agent claude --scope project
```

For an arbitrary directory:
```bash
gacli skills install --agent claude --scope /path/to/dir
# → /path/to/dir/.claude/skills/gacli/
```

## First interaction

Open Claude Code and ask any of:

- *"What was my GA4 traffic last week by country?"* → the skill auto-invokes
  and the agent runs `gacli report run -m sessions -d country …` shelling out
  via Bash with no per-call permission prompt.
- *"List my GA4 custom dimensions."* → `gacli admin custom-dimensions list`.
- *"Audit my property."* → multi-command sweep over admin lists.

You can also invoke explicitly:
```
/gacli
```

## Manual install (without `gacli` on PATH)

```bash
mkdir -p ~/.claude/skills
cp -r "$(npm root -g)/@nalyk/gacli/extensions/claude-code/skills/gacli" \
  ~/.claude/skills/
cp "$(npm root -g)/@nalyk/gacli/extensions/_core"/*.md \
  ~/.claude/skills/gacli/references/
```

## Uninstall

```bash
gacli skills uninstall --agent claude --scope user
```

Or manually:
```bash
rm -rf ~/.claude/skills/gacli
```

## Troubleshooting

- **Skill doesn't auto-invoke**: Claude Code may have many other skills
  competing for description budget. Set
  `SLASH_COMMAND_TOOL_CHAR_BUDGET=16000` to widen it, or invoke `/gacli`
  explicitly.
- **`gacli` not found**: confirm `which gacli`; reinstall via
  `npm install -g @nalyk/gacli`.
- **`gacli auth status` shows unauthenticated**: run `gacli auth login`.
