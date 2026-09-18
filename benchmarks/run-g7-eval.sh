#!/usr/bin/env bash
# Three payment conditions, two deterministic scenarios, three repetitions each.
# Requires a repository checkout, npm dependencies, Node type stripping, Foundry.
set -euo pipefail
cd "$(dirname "$0")/../packages/eval"
OUT="../../research/results/g7-eval-$(date -u +%Y-%m-%d).txt"
npm run start > "$OUT" 2>&1
cat "$OUT"
echo "wrote $OUT"
