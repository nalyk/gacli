#!/usr/bin/env bash
# Experimental single-executable build (Node >= 25.5 for `node --build-sea` with an ESM main).
# Bundles everything (GA SDKs included) into dist-sea/gacli.js, then embeds it into a copy of the
# running node binary as dist-sea/gacli. `skills install` needs the npm package (or
# GACLI_EXTENSIONS_DIR): the extensions/ tree is not embedded.
set -euo pipefail
cd "$(dirname "$0")/.."

major=$(node -p 'process.versions.node.split(".")[0]')
if (( major < 26 )); then
  echo "Node >= 26 required for --build-sea with an ESM main (found $(node --version))." >&2
  exit 1
fi

pnpm exec tsdown --config tsdown.sea.config.ts
node --build-sea sea-config.json

platform=$(node -p 'process.platform')
arch=$(node -p 'process.arch')
ext=$([[ "$platform" == "win32" ]] && echo ".exe" || echo "")
out="dist-sea/gacli-${platform}-${arch}${ext}"
mv "dist-sea/gacli${ext}" "$out" 2>/dev/null || mv dist-sea/gacli "$out"
if [[ "$platform" == "darwin" ]]; then
  codesign --sign - "$out"
fi
"./$out" --version
echo "Built $out"
