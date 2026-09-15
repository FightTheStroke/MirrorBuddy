#!/usr/bin/env bash
# Full release gate. Reuse only native evidence bound to unchanged inputs/build.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

EVIDENCE_DIR=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --evidence-dir)
      [[ $# -ge 2 && -n "$2" ]] || { echo "Missing evidence directory" >&2; exit 1; }
      EVIDENCE_DIR="$2"
      shift 2
      ;;
    --summary-only) shift ;;
    *) echo "Usage: release-gate.sh [--summary-only] [--evidence-dir <external-directory>]" >&2; exit 1 ;;
  esac
done
if [[ -z "$EVIDENCE_DIR" ]]; then
  EVIDENCE_DIR=$(mktemp -d "${TMPDIR:-/tmp}/mirrorbuddy-native-release.XXXXXX")
fi
echo "Release evidence directory: $EVIDENCE_DIR"

# Remote policy and vulnerability advisories are always checked afresh.
node scripts/release-native-evidence.mjs run policy "$EVIDENCE_DIR"
node scripts/release-native-evidence.mjs reuse-or-run pre-release "$EVIDENCE_DIR"
node scripts/release-native-evidence.mjs run unit "$EVIDENCE_DIR"
node scripts/release-native-evidence.mjs run e2e "$EVIDENCE_DIR"
# Long test runs must not leave stale operational/advisory evidence at signoff.
node scripts/release-native-evidence.mjs run policy "$EVIDENCE_DIR"
node scripts/release-native-evidence.mjs run audit "$EVIDENCE_DIR"
bash scripts/release-evidence-pack.sh "$EVIDENCE_DIR"

echo "Release automated checks passed with complete native evidence."
echo "Production deployment and live smoke verification remain separate required steps."
echo "Complete the manual locale/service checks linked from CONTRIBUTING.md#release-verification."
