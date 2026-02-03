# ADR 0114: Query Raw Elimination

Status: Accepted | Date: 03 Feb 2026 | Plan: 113

## Context

We had multiple usages of `prisma.$queryRawUnsafe` in API routes (e.g., funnel users) for performance with `DISTINCT ON`. This creates injection risk and violates ADR 0105 Prisma patterns and ADR 0033 RAG safety.

## Decision

Replace all raw unsafe calls with parameterized Prisma `sql/raw` helpers. For funnel users, move to `prisma.$queryRaw` with `Prisma.raw`/`Prisma.empty` to keep the `DISTINCT ON` query while ensuring parameters are bound.

## Consequences

- Positive: Eliminates SQL injection vector; aligns with Prisma safe query patterns.
- Negative: Slightly more verbose queries and need to import Prisma helpers.

## Enforcement

- Rule: `grep -R "$queryRawUnsafe" src/` must return zero results.
- Check: `rg "queryRawUnsafe" src --glob '*.ts'` in CI.
