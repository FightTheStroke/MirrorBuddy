# Schema Migration Checklist

## Context

This checklist prevents schema drift issues discovered during BrutalRelease-Main (2026-01-21).

**Problem**: Prisma models added to schema without creating migration files cause CI failures on fresh databases.

## Before Committing Schema Changes

### 1. Verify Migration Files Exist

```bash
# List all Prisma models
grep -r "^model " prisma/schema/

# List all migrations
ls -1 prisma/migrations/
```

**Rule**: Every model must have a corresponding migration file.

### 2. Create Missing Migrations

If you find models without migrations:

```bash
# Create migration (use descriptive name)
npx prisma migrate dev --name add_model_name_table

# Verify SQL is idempotent
cat prisma/migrations/YYYYMMDDHHMMSS_add_model_name_table/migration.sql
```

### 3. PostgreSQL Anonymous Block Syntax

**CRITICAL**: PostgreSQL requires `DO $$` (double dollar signs) for anonymous code blocks.

❌ **WRONG**:

```sql
DO $
BEGIN
    -- code here
END $;
```

✅ **CORRECT**:

```sql
DO $$
BEGIN
    -- code here
END $$;
```

**Error if wrong**: `ERROR: syntax error at or near "$"` (code 42601)

### 4. Idempotent Migration Patterns

Always use these patterns:

```sql
-- Create table
CREATE TABLE IF NOT EXISTS "TableName" (
    "id" TEXT NOT NULL,
    -- columns...
    CONSTRAINT "TableName_pkey" PRIMARY KEY ("id")
);

-- Create index
CREATE INDEX IF NOT EXISTS "TableName_field_idx" ON "TableName"("field");

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS "TableName_field_key" ON "TableName"("field");

-- Conditional foreign key (checks if parent table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ParentTable') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'TableName_parentId_fkey'
        ) THEN
            ALTER TABLE "TableName"
            ADD CONSTRAINT "TableName_parentId_fkey"
            FOREIGN KEY ("parentId") REFERENCES "ParentTable"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;
```

### 5. Test Migration Locally

```bash
# Reset local database
npx prisma migrate reset --force

# Apply migrations
npx prisma migrate deploy

# Verify all tables exist
npx prisma studio
```

### 6. CI Pre-Push Check

The pre-push hook runs migration checks:

```bash
npm run pre-push
```

This simulates Vercel's fresh Prisma generation and catches migration issues.

## Common Issues

### Issue 1: "Table does not exist" in CI

**Cause**: Model exists in schema but no migration file.

**Fix**: Create migration file with `CREATE TABLE IF NOT EXISTS`.

**Prevention**: Run pre-push check before pushing.

### Issue 2: SQL Syntax Error (42601)

**Cause**: Used `DO $` instead of `DO $$`.

**Fix**: Change all `DO $` to `DO $$` in migration file.

**Prevention**: Use this document's templates.

### Issue 3: Migration Fails on Re-Run

**Cause**: Migration not idempotent (missing `IF NOT EXISTS`).

**Fix**: Add `IF NOT EXISTS` to all CREATE statements.

**Prevention**: Use templates above.

## Verification Commands

```bash
# Check for schema drift
npm run typecheck && npm run build

# Verify migration naming
ls prisma/migrations/ | grep -E '^[0-9]{14}_'

# Test migrations on fresh database
docker-compose down -v && docker-compose up -d && npx prisma migrate deploy
```

## Related Documents

- ADR 0028: Database Architecture (Prisma + PostgreSQL)
- ADR 0052: Migration workflow
- `docs/setup/database.md`: Local database setup
- `.claude/rules/e2e-testing.md`: E2E test wall bypass patterns

## Session Reference

This checklist created from learnings in BrutalRelease-Main plan (ID: 59).

**Issues fixed**:

- 3 missing migrations (InviteRequest, SessionMetrics, GoogleAccount)
- SQL syntax errors (DO $ → DO $$)
- CI failures on fresh database

**Commits**:

- 653e6fd4: add migration for InviteRequest table
- 9552840b: add migrations for SessionMetrics and GoogleAccount tables
- 54b44342: fix DO block syntax in InviteRequest migration
- 0a2ba6cb: fix DO block syntax in SessionMetrics and GoogleAccount migrations
