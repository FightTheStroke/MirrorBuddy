# Database Setup (PostgreSQL + pgvector)

## macOS Installation

```bash
# Install PostgreSQL 17
brew install postgresql@17
brew services start postgresql@17

# Create database
createdb mirrorbuddy

# Enable vector extension
psql -d mirrorbuddy -c "CREATE EXTENSION vector;"
```

## Environment Configuration

Add to `.env`:
```bash
DATABASE_URL=postgresql://user@localhost:5432/mirrorbuddy
```

## Prisma Commands

```bash
# Generate Prisma client (after schema changes)
npx prisma generate

# Push schema to database
npx prisma db push

# Open Prisma Studio
npx prisma studio
```

## Schema Location

`prisma/schema.prisma` - PostgreSQL with pgvector for semantic search.

## ADR Reference

See ADR 0028 for full migration details from SQLite to PostgreSQL.
