# Database Setup (PostgreSQL + pgvector)

## macOS Installation

```bash
# Install PostgreSQL 17
brew install postgresql@17
brew services start postgresql@17

# Create databases (dev + test)
createdb mirrorbuddy
createdb mirrorbuddy_test

# Enable vector extension
psql -d mirrorbuddy -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql -d mirrorbuddy_test -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

## Environment Configuration

Add to `.env`:

```bash
# Development
DATABASE_URL=postgresql://user@localhost:5432/mirrorbuddy
DIRECT_URL=postgresql://user@localhost:5432/mirrorbuddy

# Test (for unit/E2E tests)
TEST_DATABASE_URL=postgresql://user@localhost:5432/mirrorbuddy_test
TEST_DIRECT_URL=postgresql://user@localhost:5432/mirrorbuddy_test
```

## Prisma Commands

### Development Workflow

```bash
# Generate Prisma client (after schema changes)
npx prisma generate

# Create new migration (LOCAL DEVELOPMENT ONLY)
npx prisma migrate dev --name descriptive_name

# Open Prisma Studio
npx prisma studio
```

### Production/CI Workflow

```bash
# Apply existing migrations (CI, staging, production)
npx prisma migrate deploy
```

### CRITICAL: Never Use `db push` on Tracked Databases

| Command                 | When to Use              | Migration Tracking |
| ----------------------- | ------------------------ | ------------------ |
| `prisma migrate dev`    | Local development        | ✅ Yes             |
| `prisma migrate deploy` | CI/Production            | ✅ Yes             |
| `prisma db push`        | Initial prototyping ONLY | ❌ No              |

**Why?** `db push` applies schema but doesn't create `_prisma_migrations` table.
Future `migrate deploy` will fail because it can't track what's been applied.

See ADR 0052 for recovery procedures if this happens.

## Schema Location

`prisma/schema/` - PostgreSQL with pgvector for semantic search.

## Supabase (Production)

For Supabase configuration including SSL certificates, see:

- ADR 0052: Vercel Deployment Configuration (Database Migrations section)
- ADR 0063: Supabase SSL Certificate Requirements

## ADR Reference

- ADR 0028: PostgreSQL + pgvector migration from SQLite
- ADR 0052: Vercel deployment (includes migration workflow)
- ADR 0063: Supabase SSL requirements
