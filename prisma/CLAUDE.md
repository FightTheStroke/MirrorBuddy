# Prisma — MirrorBuddy

PostgreSQL + pgvector. Schema split across `prisma/schema/` (ADR enables multi-file). Migrations in `prisma/migrations/`.

## After ANY schema change

```bash
npx prisma generate       # regenerate client
npx prisma migrate dev --name <slug>   # local migration
npm run ci:summary        # types pass
```

## Hard Rules

- Parameterized queries ONLY. No `$queryRaw` with string interpolation.
- Migrations are APPEND-ONLY. Never edit applied migrations.
- PII fields (email, name, birthdate, etc.): document in DPIA (`docs/compliance/DPIA.md`).
- Vector columns: use `pgvector` type. Embeddings scrubbed of PII before insert.
- Cascades explicit: declare `onDelete` / `onUpdate` — never rely on defaults.
- Indexes: add for query paths used at scale (see `src/lib/db/query-patterns.ts`).
- Soft-delete: `deletedAt` timestamp + scope queries. Hard-delete only via admin GDPR endpoint.

## Seeding

- `seed.ts` = minimal dev bootstrap.
- `seed-tiers.ts`, `seed-model-catalog.ts` = idempotent reference data.
- Never seed PII or real users.

## Local Postgres

NOT auto-started. `brew services start postgresql@17` or `./scripts/ensure-test-db.sh`. CI/prod = Supabase.

## Common pitfalls

- Forgetting `prisma generate` → type errors across repo.
- Editing `schema.prisma` but not `schema/` split → drift.
- `dev.db` (SQLite) is legacy — ignore for production schema decisions.

## Migration naming

`<action>-<entity>` — e.g. `add-fsrs-cards`, `index-users-email`. Conventional.
