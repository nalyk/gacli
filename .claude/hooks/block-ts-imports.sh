#!/usr/bin/env bash
# PreToolUse hook for Edit/Write/MultiEdit on TS files in this project.
# Blocks (exit 2) if the new content adds a relative import ending in
# .ts/.tsx/.mts/.cts. ESM + moduleResolution: bundler requires .js.
# Scope: only files inside $CLAUDE_PROJECT_DIR/{src,test}.
set -euo pipefail

input=$(cat)
tool_name=$(jq -r '.tool_name // empty' <<<"$input")
file_path=$(jq -r '.tool_input.file_path // empty' <<<"$input")
project_dir="${CLAUDE_PROJECT_DIR:-}"

# Only enforce in this project's src/ and test/ trees.
[[ -n "$project_dir" && -n "$file_path" ]] || exit 0
case "$file_path" in
  "$project_dir"/src/*.ts|"$project_dir"/src/*.tsx|"$project_dir"/src/*.mts|"$project_dir"/src/*.cts) ;;
  "$project_dir"/test/*.ts|"$project_dir"/test/*.tsx|"$project_dir"/test/*.mts|"$project_dir"/test/*.cts) ;;
  *) exit 0 ;;
esac

# Collect added text from each edit-shaped tool.
case "$tool_name" in
  Edit)      candidates=$(jq -r '.tool_input.new_string // empty' <<<"$input") ;;
  Write)     candidates=$(jq -r '.tool_input.content    // empty' <<<"$input") ;;
  MultiEdit) candidates=$(jq -r '[.tool_input.edits[]?.new_string] | join("\n")' <<<"$input") ;;
  *) exit 0 ;;
esac

# Match relative imports ending in a TS extension. Allows single or double quotes.
if grep -qE "from[[:space:]]+['\"]\\.\\.?/[^'\"]*\\.(ts|tsx|mts|cts)['\"]" <<<"$candidates"; then
  echo "BLOCKED: relative imports must end in .js, not .ts/.tsx/.mts/.cts." >&2
  echo "         ESM + moduleResolution: bundler requires it. See CLAUDE.md rule #1." >&2
  exit 2
fi

exit 0
