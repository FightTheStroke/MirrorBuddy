# ADR 0146: Architecture Map and Drift-Check Script

Status: Accepted | Date: 12 Feb 2026 | Plan: none

## Context

Agents made cross-domain changes without understanding dependency structure, causing
circular imports and layer violations. Coding standards (250-line max, no ts-ignore)
had no automated enforcement beyond ESLint. Inspired by OpenAI "Harness Engineering".

## Decision

Created `docs/architecture-map.md`: 6-layer model (Types->Infrastructure->Horizontal->
Domain->State->Presentation) with allowed-imports matrix and high-impact modules.
Created `scripts/drift-check.sh`: detects long files, ts-ignore, `as any`, TODO/FIXME,
circular deps. Outputs JSON (--summary), detail (--detail), or fixes (--fix-hint).

## Consequences

- Positive: Agents read map before cross-domain changes; drift-check catches violations in seconds
- Negative: Architecture map needs manual update when new domains are added

## Enforcement

- Rule: `scripts/drift-check.sh` must exit 0 (no errors) before merge
- Check: `scripts/drift-check.sh --summary | grep '"status"'` must be CLEAN or WARN
- Ref: ADR 0045 (module boundaries), coding-standards.md
