#!/usr/bin/env bash
# Last-N-days traffic snapshot. Default: 7 days.
# Output: gacli ReportData JSON on stdout. Errors on stderr; non-zero exit on
# gacli failure (so the calling agent can detect).
#
# Usage:
#   bash traffic.sh              # last 7 days, default property
#   bash traffic.sh 30           # last 30 days
#   bash traffic.sh 14 -p 12345  # last 14 days, override property

set -euo pipefail

if [[ "${1:-}" == "--help" ]]; then
  cat <<EOF
Usage: bash traffic.sh [DAYS] [extra gacli args...]
Default: 7 days. Returns sessions, activeUsers, screenPageViews by date.
EOF
  exit 0
fi

DAYS="${1:-7}"
shift || true

exec gacli report run \
  -m sessions,activeUsers,screenPageViews \
  -d date \
  --start-date "${DAYS}daysAgo" \
  --end-date today \
  --order-by dimension:date:asc \
  -f json \
  "$@"
