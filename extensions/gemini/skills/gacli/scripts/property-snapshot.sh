#!/usr/bin/env bash
# Print a JSON snapshot of the current gacli property + auth state.
# Output schema: { "property_id": "<id>|null", "auth": "ok|unauthenticated",
#                  "user": "<email>|null" }
#
# Exit 0 always (so the calling agent doesn't blow up on auth issues; the
# JSON itself reports the state).

set -u

if [[ "${1:-}" == "--help" ]]; then
  cat <<EOF
Usage: bash property-snapshot.sh
Prints {property_id, auth, user} as JSON to stdout.
EOF
  exit 0
fi

prop="$(gacli config get property 2>/dev/null | tr -d '[:space:]' || true)"
if [[ -z "$prop" || "$prop" == "(notset)" ]]; then
  prop_json="null"
else
  prop_json="\"$prop\""
fi

if status="$(gacli auth status -f json 2>/dev/null)"; then
  auth_json='"ok"'
  # best-effort: pick out a likely user/email field
  user="$(printf '%s' "$status" | jq -r 'first(.rows[]?[]? | select(test("@")?)) // empty' 2>/dev/null || true)"
  if [[ -n "$user" ]]; then
    user_json="\"$user\""
  else
    user_json="null"
  fi
else
  auth_json='"unauthenticated"'
  user_json='null'
fi

printf '{"property_id":%s,"auth":%s,"user":%s}\n' "$prop_json" "$auth_json" "$user_json"
