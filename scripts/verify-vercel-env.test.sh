#!/bin/bash
# Compatibility entry point for functional, isolated verifier regression tests.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
pnpm exec vitest run --root apps/web scripts/__tests__/check-vercel-env.test.ts
