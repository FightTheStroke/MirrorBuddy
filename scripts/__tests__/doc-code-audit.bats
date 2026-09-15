#!/usr/bin/env bats
# Native fixtures; never read or modify the developer's application checkout.

setup() {
  ROOT="$BATS_TEST_TMPDIR/project"
  mkdir -p "$ROOT/scripts" "$ROOT/apps/web/src/lib/tier" \
    "$ROOT/apps/web/src/app/api/health" "$ROOT/docs/operations"
  cp "$BATS_TEST_DIRNAME/../doc-code-audit.sh" "$ROOT/scripts/"
  cat > "$ROOT/README.md" <<'DOC'
## Trial Mode
| Chat messages | 10 | Conversations with Maestri |
| Voice time | 5 minutes |
| Tool calls | 10 |
| Documents | 1 |
No per-Maestro cap (ADR 0168).
---
| `healthy` | OK |
| `degraded` | Warning |
| `unhealthy` | Failed |
DOC
  cat > "$ROOT/apps/web/src/lib/tier/tier-fallbacks.ts" <<'CODE'
if (code === TierCode.TRIAL) {
return {
chatLimitDaily: 10,
voiceMinutesDaily: 5,
toolsLimitDaily: 10,
docsLimitTotal: 1,
realtimeModel: 'gpt-realtime-mini',
};
}
CODE
  printf "'healthy'\n'degraded'\n'unhealthy'\n" > "$ROOT/apps/web/src/app/api/health/route.ts"
  printf '{ "path": "/api/cron/metrics-push",\n"schedule": "*/5 * * * *"\n}' > "$ROOT/apps/web/vercel.json"
  printf 'Metrics push: 5 minutes\n' > "$ROOT/docs/operations/CRON-JOBS.md"
}

@test "current monorepo defaults and single-quoted health states pass" {
  run bash "$ROOT/scripts/doc-code-audit.sh"
  [ "$status" -eq 0 ]
  [[ "$output" == *"No per-Maestro cap"* ]]
}

@test "README trial chat mismatch is blocking" {
  printf '## Trial Mode\n| Chat messages | 99 |\n---\n' > "$ROOT/README.md"
  run bash "$ROOT/scripts/doc-code-audit.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"Trial chat limit mismatch"* ]]
}

@test "removed Maestro cap is not accepted as current behavior" {
  printf '\n| **Maestri access** | 3 random | 25 | 26 |\n' >> "$ROOT/README.md"
  run bash "$ROOT/scripts/doc-code-audit.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"Removed per-Maestro cap"* ]]
}

@test "unhealthy never substitutes for healthy" {
  printf "'degraded'\n'unhealthy'\n" > "$ROOT/apps/web/src/app/api/health/route.ts"
  run bash "$ROOT/scripts/doc-code-audit.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"Health status 'healthy' mismatch"* ]]
}

@test "deprecated voice models and missing metrics configuration fail" {
  printf "\nrealtimeModel: 'gpt-4o-realtime-preview'\n" >> "$ROOT/apps/web/src/lib/tier/tier-fallbacks.ts"
  printf '{}\n' > "$ROOT/apps/web/vercel.json"
  run bash "$ROOT/scripts/doc-code-audit.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"deprecated voice model"* ]]
  [[ "$output" == *"Metrics push cadence mismatch"* ]]
}

@test "missing operational documentation cannot silently skip cross-check" {
  rm "$ROOT/docs/operations/CRON-JOBS.md"
  run bash "$ROOT/scripts/doc-code-audit.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"Required audit input missing or unreadable"* ]]
}
