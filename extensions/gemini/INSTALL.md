# Install the gacli skill into Gemini CLI

**Tested against:** Gemini CLI 0.40+.

## Prerequisites

- `gacli` on PATH: `npm install -g @nalyk/gacli`.
- `jq` on PATH (used by the bundled deterministic scripts):
  `apt install jq` / `brew install jq`.
- Authenticated to GA4: `gacli auth login` (OAuth) or
  `gacli config set credentials /path/to/sa.json`.
- Gemini CLI installed: <https://github.com/google-gemini/gemini-cli>.

## One-line install

```bash
gacli skills install --agent gemini --scope user
```

Drops the skill at `~/.gemini/skills/gacli/`. Gemini CLI auto-discovers
it on next session start.

For project scope:
```bash
gacli skills install --agent gemini --scope project
# → ./.gemini/skills/gacli/
```

For an arbitrary directory:
```bash
gacli skills install --agent gemini --scope /path/to/dir
# → /path/to/dir/.gemini/skills/gacli/
```

## First interaction

In a Gemini CLI session, ask any of:

- *"Audit my GA4 property."* → the skill activates and the agent runs
  `bash ./scripts/property-audit.sh`.
- *"Give me a traffic snapshot."* → `bash ./scripts/traffic.sh` (last 7
  days by default, deterministic).
- *"What's happening live in GA4?"* → `gacli report realtime …`.

**Note on activation:** Gemini CLI activates skills based on the
description matching user intent (no slash invocation per the docs). If
auto-activation feels missed, mention the skill explicitly: *"Use the
gacli skill to give me last week's traffic."*

## Headless mode

The skill also works in headless mode (`gemini -p`):
```bash
gemini -p "Use the gacli skill: give me last 7 days of traffic as JSON" \
  --output-format json
```

## Manual install (without `gacli` on PATH)

```bash
mkdir -p ~/.gemini/skills
cp -r "$(npm root -g)/@nalyk/gacli/extensions/gemini/skills/gacli" \
  ~/.gemini/skills/
mkdir -p ~/.gemini/skills/gacli/references
cp "$(npm root -g)/@nalyk/gacli/extensions/_core"/*.md \
  ~/.gemini/skills/gacli/references/
chmod +x ~/.gemini/skills/gacli/scripts/*.sh
```

## Uninstall

```bash
gacli skills uninstall --agent gemini --scope user
```

Or manually:
```bash
rm -rf ~/.gemini/skills/gacli
```

## Troubleshooting

- **Skill never activates**: front-load the user prompt with explicit GA4
  keywords, or mention "use the gacli skill" by name.
- **`bash ./scripts/X.sh` fails**: confirm `jq` is on PATH (the property
  audit script uses jq to merge five JSON payloads). On Debian/Ubuntu:
  `sudo apt install jq`.
- **`property-snapshot.sh` always reports unauthenticated**: run
  `gacli auth status` outside Gemini to verify; reauthenticate via
  `gacli auth login`.
- **Determinism wins**: per the danicat.dev pattern (the design lodestar for
  Gemini skills), prefer the bundled scripts over asking the agent to
  assemble raw `gacli` flag strings. Scripts return predictable shapes;
  free-form flag assembly is brittle.
