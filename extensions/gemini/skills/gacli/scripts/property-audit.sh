#!/usr/bin/env bash
# One-shot property audit. Lists custom dims, custom metrics, key events,
# datastreams, audiences. Output: a single JSON object combining all five
# lists, one section per admin sub-domain.

set -euo pipefail

if [[ "${1:-}" == "--help" ]]; then
  cat <<EOF
Usage: bash property-audit.sh [extra gacli args...]
Returns { custom_dimensions, custom_metrics, key_events, datastreams,
audiences } each as a parsed gacli JSON payload.
EOF
  exit 0
fi

cd_json="$(gacli admin custom-dimensions list -f json "$@" 2>/dev/null || echo 'null')"
cm_json="$(gacli admin custom-metrics    list -f json "$@" 2>/dev/null || echo 'null')"
ke_json="$(gacli admin key-events        list -f json "$@" 2>/dev/null || echo 'null')"
ds_json="$(gacli admin datastreams       list -f json "$@" 2>/dev/null || echo 'null')"
au_json="$(gacli admin audiences         list -f json "$@" 2>/dev/null || echo 'null')"

jq -n \
  --argjson cd "$cd_json" \
  --argjson cm "$cm_json" \
  --argjson ke "$ke_json" \
  --argjson ds "$ds_json" \
  --argjson au "$au_json" \
  '{custom_dimensions:$cd, custom_metrics:$cm, key_events:$ke, datastreams:$ds, audiences:$au}'
