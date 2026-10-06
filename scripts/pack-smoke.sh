#!/usr/bin/env bash
# Install the packed tarball into a throwaway prefix and exercise the installed binary.
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cd "$root"
tarball=$(pnpm pack --pack-destination "$work" | tail -1)
cd "$work"
npm init -y >/dev/null
npm install --no-audit --no-fund --loglevel=error "$tarball" >/dev/null
bin="$work/node_modules/.bin/gacli"
export HOME="$work/home"
mkdir -p "$HOME"
"$bin" --version
"$bin" schema report run >/dev/null
"$bin" skills install --agent claude --dry-run | grep -q '"files"'   # resolves the packaged extensions/ tree
printf '%s\n%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"1"}}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | "$bin" mcp serve | grep -q '"ga_report_run"'
echo "pack smoke OK"
