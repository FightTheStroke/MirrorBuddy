# ADR 0145: Migration Best Practices

Status: Accepted | Date: 10 Feb 2026 | Plan: none

## Context

Database assessment revealed patterns that can cause deployment issues:
duplicate migration timestamps, oversized migrations, excessive use of
`IF NOT EXISTS` / `DO $$` idempotency blocks.

## Decision

Establish migration guidelines enforced by code review:

1. **Unique timestamps**: Never reuse a timestamp. Verify with
   `ls prisma/migrations/ | cut -d_ -f1 | sort | uniq -d` (must be empty)
2. **Max 3 tables per migration**: Split large schema changes into
   sequential migrations to reduce table lock duration
3. **No IF NOT EXISTS**: Trust Prisma's migration tracking. Idempotent
   DDL hides real errors and creates false confidence
4. **Data migrations separate**: `UPDATE`/`INSERT` statements go in their
   own migration, never mixed with DDL (`CREATE`/`ALTER`)
5. **Schema drift check**: Run `./scripts/ci-summary.sh --migrations`
   before push (enforced by pre-push hook and CI Lane 4b)

## Consequences

- Positive: Predictable deploys, shorter table locks, clearer audit trail
- Negative: More migration files (acceptable trade-off)

## Enforcement

- Rule: CI Lane 4b blocks merge on schema drift (ADR 0137)
- Check: `ls prisma/migrations/ | cut -d_ -f1 | sort | uniq -d | wc -l`
