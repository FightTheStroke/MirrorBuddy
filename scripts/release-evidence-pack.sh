#!/usr/bin/env bash
# Read existing native execution receipts. Never launch tests, builds or audits.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
if [[ $# -ne 1 || -z "${1:-}" ]]; then
  echo "Usage: release-evidence-pack.sh <native-evidence-directory>" >&2
  echo "Generate bound evidence with release-gate.sh; missing evidence is not a pass." >&2
  exit 1
fi
node scripts/release-native-evidence.mjs collect "$1"
