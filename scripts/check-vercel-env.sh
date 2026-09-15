#!/bin/bash
# Check remote production names without exporting or printing secret values.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "$ROOT_DIR/scripts/lib/vercel-link.sh"

if ! command -v vercel >/dev/null; then
  echo "ERROR: Vercel CLI missing; production metadata cannot be verified."
  exit 1
fi
VERCEL_CWD=$(resolve_vercel_cwd "$ROOT_DIR") || exit 1
pnpm exec tsx scripts/check-production-env.ts release-metadata "$VERCEL_CWD"
echo "Production names checked. Newline integrity is checked inside the deployment build."
