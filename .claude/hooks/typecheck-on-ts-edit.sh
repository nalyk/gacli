#!/usr/bin/env bash
# PostToolUse hook for Edit/Write/MultiEdit on TS files in this project.
# Runs `pnpm type-check` after every edit to $CLAUDE_PROJECT_DIR/src/**/*.ts
# (and test/) and surfaces any tsc errors back to Claude as additional context.
# Stays silent when type-check is clean to keep noise low.
set -euo pipefail

input=$(cat)
file_path=$(jq -r '.tool_input.file_path // empty' <<<"$input")
project_dir="${CLAUDE_PROJECT_DIR:-}"

[[ -n "$project_dir" && -n "$file_path" ]] || exit 0
case "$file_path" in
  "$project_dir"/src/*.ts|"$project_dir"/src/*.tsx|"$project_dir"/src/*.mts|"$project_dir"/src/*.cts) ;;
  "$project_dir"/test/*.ts|"$project_dir"/test/*.tsx|"$project_dir"/test/*.mts|"$project_dir"/test/*.cts) ;;
  *) exit 0 ;;
esac

cd "$project_dir"

# Skip silently if dependencies aren't installed — every error would be a phantom
# "Cannot find module" until `pnpm install` runs. That's a setup issue, not a code issue.
[[ -d node_modules ]] || exit 0

# Run type-check; capture both streams. Non-zero exit is fine — we surface it.
output=$(pnpm -s type-check 2>&1) || true

if grep -qE "error TS[0-9]+" <<<"$output"; then
  printf 'post-edit type-check FAILED for %s:\n%s\n' "$file_path" "$output"
fi

exit 0
