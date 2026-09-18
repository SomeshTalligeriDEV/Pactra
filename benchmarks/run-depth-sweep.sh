#!/usr/bin/env bash
# Separate gasleft() measurements; shared contracts within one test transaction.
set -euo pipefail
cd "$(dirname "$0")/../packages/contracts"
OUT="../../research/results/depth-sweep-$(date -u +%Y-%m-%d).csv"
RAW="$(mktemp)"
trap 'rm -f "$RAW"' EXIT
forge test --match-contract G11_DepthSweep -vv > "$RAW" 2>&1
printf 'depth,gas\n' > "$OUT"
grep -E '^[[:space:]]*[0-9]+,[0-9]+$' "$RAW" | sed 's/^[[:space:]]*//' >> "$OUT"
echo "wrote $OUT"
cat "$OUT"
