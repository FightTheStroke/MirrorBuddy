#!/usr/bin/env bash
# focus-group-capture.sh — Capture page-source artifacts for focus-group sessions
#
# Usage:
#   ./scripts/focus-group-capture.sh <URL> [OPTIONS]
#
# Options:
#   --persona <ID>   Persona ID for output naming (e.g. P5-giulia, P7-davide)
#   --step    <ID>   Step ID for output naming   (e.g. T5, s01, s04)
#   --out     <DIR>  Output directory (default: docs/focus-group/captures/)
#   --help           Show this help
#
# What it does:
#   1. Fetches the raw HTML of <URL> via curl (quick reachability check)
#   2. Prints the full Playwright command that produces the real focus-group
#      artifacts: .text.json, .aria.yaml, .focus.json, .tts.json, .png
#   3. Prints FGOP-10 artifact notes (dev-server contaminants to exclude)
#
# Examples:
#   ./scripts/focus-group-capture.sh http://localhost:3000/it/achievements
#   ./scripts/focus-group-capture.sh http://localhost:3000/it \
#     --persona P5-giulia --step s01 \
#     --out docs/focus-group/runs/2026-06-13-pass3/stimulus/captures
#
# Prerequisites:
#   - curl  (for reachability check + source peek)
#   - The app MUST run on a production build (npm run build && npm start)
#     to avoid FGOP-10 dev-server contaminants in the captured artifacts.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Defaults ──────────────────────────────────────────────────────────────────
URL=""
PERSONA=""
STEP=""
OUT_DIR="${PROJECT_DIR}/docs/focus-group/captures"

# ── Argument parsing ──────────────────────────────────────────────────────────
if [[ $# -eq 0 ]]; then
  echo "Usage: $0 <URL> [--persona <ID>] [--step <ID>] [--out <DIR>]" >&2
  exit 1
fi

URL="${1}"
shift

while [[ $# -gt 0 ]]; do
  case "$1" in
    --persona) PERSONA="${2:-}"; shift 2 ;;
    --step)    STEP="${2:-}";    shift 2 ;;
    --out)     OUT_DIR="${2:-}"; shift 2 ;;
    --help)
      grep '^#' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# ── Derive artifact filename prefix ───────────────────────────────────────────
ARTIFACT_PREFIX=""
[[ -n "$PERSONA" ]] && ARTIFACT_PREFIX="${PERSONA}"
[[ -n "$STEP"    ]] && ARTIFACT_PREFIX="${ARTIFACT_PREFIX:+${ARTIFACT_PREFIX}-}${STEP}"
[[ -z "$ARTIFACT_PREFIX" ]] && ARTIFACT_PREFIX="capture"

# ── 1. Reachability check ─────────────────────────────────────────────────────
echo ""
echo "━━━ focus-group-capture.sh ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "URL:      ${URL}"
echo "Persona:  ${PERSONA:-<not set>}"
echo "Step:     ${STEP:-<not set>}"
echo "Out dir:  ${OUT_DIR}"
echo ""
echo "── Step 1: reachability check ────────────────────────────────────────────"

HTTP_STATUS=$(curl --silent --output /dev/null --write-out "%{http_code}" \
  --max-time 5 "${URL}" 2>/dev/null) || HTTP_STATUS="000"

if [[ "$HTTP_STATUS" == "200" ]]; then
  echo "✅ ${URL} responded HTTP ${HTTP_STATUS}"
elif [[ "$HTTP_STATUS" == "000" ]]; then
  echo "❌ Could not reach ${URL} (connection refused or timeout)"
  echo "   Make sure the app is running on a PRODUCTION build:"
  echo "   npm run build && npm start"
  echo "   (NOT npm run dev — see FGOP-10 notes below)"
  echo ""
else
  echo "⚠️  ${URL} responded HTTP ${HTTP_STATUS}"
fi

# ── 2. Page source peek ───────────────────────────────────────────────────────
echo ""
echo "── Step 2: visible text snippet (first 20 non-empty lines) ──────────────"
if [[ "$HTTP_STATUS" == "200" ]]; then
  curl --silent --max-time 5 "${URL}" 2>/dev/null \
    | sed 's/<[^>]*>//g' \
    | grep -v '^\s*$' \
    | head -20 \
    || echo "(could not extract text)"
else
  echo "(skipped — URL not reachable)"
fi

# ── 3. Playwright capture command ─────────────────────────────────────────────
echo ""
echo "── Step 3: Playwright capture command ───────────────────────────────────"
echo ""
echo "Run this from the project root to produce the artifact set (.text.json,"
echo ".aria.yaml, .focus.json, .tts.json, .png) used by focus-group sessions:"
echo ""

BASE_URL="${URL}"
# Strip path to get origin
ORIGIN=$(echo "${BASE_URL}" | sed 's|\(https\?://[^/]*\).*|\1|')

cat <<PLAYWRIGHT_CMD
  # Interactive codegen (opens browser — consent wall bypass required first):
  PLAYWRIGHT_BASE_URL="${ORIGIN}" \\
    npx playwright codegen \\
    --save-storage="${PROJECT_DIR}/e2e/.auth/focus-group-${ARTIFACT_PREFIX}.json" \\
    "${BASE_URL}"

  # Headless capture against existing auth state:
  PLAYWRIGHT_BASE_URL="${ORIGIN}" \\
  FG_CAPTURE_URL="${BASE_URL}" \\
  FG_CAPTURE_PERSONA="${PERSONA:-capture}" \\
  FG_CAPTURE_STEP="${STEP:-s00}" \\
  FG_CAPTURE_OUT="${OUT_DIR}" \\
    npx playwright test \\
    --project=chromium \\
    --grep="focus-group-artifact-capture" \\
    apps/web/e2e/focus-group-capture.spec.ts
PLAYWRIGHT_CMD

# ── 4. FGOP-10 artifact notes ─────────────────────────────────────────────────
echo ""
echo "── Step 4: FGOP-10 — dev-server artifacts to exclude ────────────────────"
echo ""
echo "When captured on 'npm run dev', the following contaminants appear."
echo "They must be excluded from focus trace and text.json analysis."
echo ""
echo "  focus.json (Tab order):"
echo "    • 'NEXTJS-PORTAL' × 3 stops — Next.js dev-only portal element"
echo "    • Duplicate 'Accedi' / 'Richiedi Accesso' from dual layout render"
echo "    • 'skip-link' appearing at Tab 10+ instead of Tab 1"
echo "    • Tab index gap (e.g. 13 → 15, missing 14) = buco fantasma"
echo ""
echo "  text.json (visible text):"
echo "    • '1 Issue' red badge (bottom-left) — Next.js error overlay"
echo "    • '__NEXT_DATA__' or '__next_f' blobs in body text extraction"
echo ""
echo "  png (screenshot):"
echo "    • Red '1 Issue' pill overlapping bottom-left UI elements"
echo "    • Semi-transparent dev toolbar at the bottom of the viewport"
echo ""
echo "  Mitigation — always use production build for captures:"
echo "    npm run build && npm start"
echo "    (The capture spec also defensively hides <nextjs-portal> and the dev"
echo "     error overlay via addInitScript [FGOP-10], so dev-only artifacts are"
echo "     suppressed even if a capture is run against 'npm run dev'.)"
echo "    ./scripts/focus-group-capture.sh ${URL} \\"
[[ -n "$PERSONA" ]] && echo "      --persona ${PERSONA} \\"
[[ -n "$STEP"    ]] && echo "      --step ${STEP} \\"
echo "      --out ${OUT_DIR}"
echo ""
echo "  Reference:"
echo "    docs/focus-group/runs/2026-06-11-pass2/verification.md (§ESCLUSI)"
echo "    docs/focus-group/runs/2026-06-13-pass3/stimulus/T5-rewards-nav.md (§8)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
