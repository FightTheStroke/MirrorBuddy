#!/usr/bin/env bash
# Fresh release policy checks; never replaced by cached browser/unit evidence.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "$ROOT_DIR/scripts/lib/checks.sh"

pnpm exec tsx scripts/ci/check-version-consistency.ts
pnpm exec tsx scripts/sync-roster-counts.ts
pnpm exec tsx scripts/check-reachability.ts
pnpm exec tsx scripts/debt-check.ts --summary
if ! node -e '
try {
  const config = JSON.parse(require("node:fs").readFileSync("apps/web/vercel.json", "utf8"));
  if (!Array.isArray(config.regions) || !config.regions.includes("fra1")) process.exit(1);
} catch { process.exit(1); }
'; then
  echo "Release blocked: active application config must pin compute to fra1" >&2
  exit 1
fi

check_ts_rigor
cat "$_OUTPUT"
rm -f "$_OUTPUT"
[[ "$_EXIT" -eq 0 ]] || exit 1

pnpm exec tsx scripts/compliance-check.ts --fail-only
pnpm exec tsx scripts/compliance-audit-source-verification.ts
bash scripts/check-architecture-diagrams.sh
bash scripts/doc-code-audit.sh
bash scripts/check-vercel-env.sh
bash scripts/verify-sentry-config.sh --static-only

plan_fail=0
if [[ -d docs/plans/done ]]; then
  for file in docs/plans/done/*.md; do
    [[ -f "$file" ]] || continue
    unchecked=$(awk '/\[ \]/ {n++} END {print n+0}' "$file")
    if [[ "$unchecked" -gt 0 ]]; then
      echo "Release blocked: $file has $unchecked unfinished items"
      plan_fail=1
    fi
  done
fi
if [[ -f docs/plans/README.md ]]; then
  links=""
  status=0
  links=$(rg -o 'todo/[^)]+\.md|doing/[^)]+\.md' docs/plans/README.md) || status=$?
  [[ "$status" -le 1 ]] || exit "$status"
  while IFS= read -r link; do
    [[ -n "$link" ]] || continue
    if [[ ! -f "docs/plans/$link" ]]; then
      echo "Release blocked: missing referenced plan docs/plans/$link"
      plan_fail=1
    fi
  done <<< "$links"
fi
for directory in docs/plans/todo docs/plans/doing; do
  [[ -d "$directory" ]] || continue
  status=0
  hits=$(rg -n 'CRITICAL|BLOCKS PR merge|P0' "$directory") || status=$?
  [[ "$status" -le 1 ]] || exit "$status"
  if [[ -n "$hits" ]]; then
    printf '%s\n' "$hits"
    plan_fail=1
  fi
done
[[ "$plan_fail" -eq 0 ]] || exit 1
echo "Fresh release policy checks passed"
