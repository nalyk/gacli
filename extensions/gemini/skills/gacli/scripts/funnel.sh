#!/usr/bin/env bash
# Run a funnel report from a JSON steps array.
#
# Usage:
#   bash funnel.sh '<json-steps-array>' [--start-date 30daysAgo] [--end-date today] [-p 12345]
#
# Example:
#   bash funnel.sh '[
#     {"name":"View","filterExpression":{"filter":{"fieldName":"eventName","stringFilter":{"value":"view_item"}}}},
#     {"name":"Add","filterExpression":{"filter":{"fieldName":"eventName","stringFilter":{"value":"add_to_cart"}}}},
#     {"name":"Buy","filterExpression":{"filter":{"fieldName":"eventName","stringFilter":{"value":"purchase"}}}}
#   ]' --start-date 30daysAgo

set -euo pipefail

if [[ "${1:-}" == "--help" || $# -lt 1 ]]; then
  cat <<EOF
Usage: bash funnel.sh '<json-steps-array>' [extra gacli args...]
Validates the JSON, runs gacli report funnel, returns ReportData JSON.
EOF
  exit 0
fi

STEPS="$1"
shift

# Validate the JSON up front so the agent gets a clean error on bad input.
if ! printf '%s' "$STEPS" | jq -e 'type == "array" and length >= 2' >/dev/null; then
  echo "funnel.sh: first arg must be a JSON array of >=2 funnel steps." >&2
  exit 2
fi

exec gacli report funnel --steps "$STEPS" -f json "$@"
