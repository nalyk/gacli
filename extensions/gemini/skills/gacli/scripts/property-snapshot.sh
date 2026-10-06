#!/usr/bin/env bash
# Print a JSON snapshot of the current gacli property + auth state.
# Output schema: { "property_id": "<id>|null", "auth": "ok|unauthenticated",
#                  "credential_source": "<source>|null" }
#
# Exit 0 always (so the calling agent doesn't blow up on auth issues; the
# JSON itself reports the state).

set -u

if [[ "${1:-}" == "--help" ]]; then
  cat <<EOF
Usage: bash property-snapshot.sh
Prints {property_id, auth, credential_source} as JSON to stdout.
EOF
  exit 0
fi

prop="$(gacli config get property 2>/dev/null | tr -d '[:space:]' || true)"
if [[ -z "$prop" || "$prop" == "(notset)" ]]; then
  prop_json="null"
else
  prop_json="\"$prop\""
fi

# `auth status` succeeds even with nothing configured (ADC fallback); `auth token` proves credentials work.
if gacli auth token >/dev/null 2>&1 && status="$(gacli auth status -f json 2>/dev/null)"; then
  auth_json='"ok"'
  # gacli 2.x: {"source":"oauth|access-token|env-credentials|config-credentials|adc", ...}
  source="$(printf '%s' "$status" | jq -r '.source // empty' 2>/dev/null || true)"
  if [[ -n "$source" ]]; then
    user_json="\"$source\""
  else
    user_json="null"
  fi
else
  auth_json='"unauthenticated"'
  user_json='null'
fi

printf '{"property_id":%s,"auth":%s,"credential_source":%s}\n' "$prop_json" "$auth_json" "$user_json"
