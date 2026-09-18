#!/usr/bin/env bash
# Full suite, including correctness, fuzz, invariant, search, and depth tests.
set -euo pipefail
cd "$(dirname "$0")/../packages/contracts"
OUT="../../research/results/gas-report-$(date -u +%Y-%m-%d).txt"
forge test --gas-report --fuzz-seed 0x5042002 > "$OUT" 2>&1
echo "wrote $OUT"
