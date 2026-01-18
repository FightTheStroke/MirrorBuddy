# ADR 0053: Supabase Migration

## Status

Accepted

## Date

2026-01-18

## Context

MirrorBuddy maintains PostgreSQL databases with pgvector for RAG embeddings and semantic search. Local PostgreSQL requires manual setup and resource overhead. Production deployment requires reliable, managed database infrastructure with automatic backups, SSL/TLS, and seamless Vercel integration.

**Key requirements:**
- Managed PostgreSQL with pgvector support
- Production-grade backups and high availability
- Connection pooling for serverless functions
- Seamless Vercel environment setup
- Direct migration URL for Prisma migrations

## Decision

**Migrate from self-managed PostgreSQL to Supabase PostgreSQL.**

Supabase provides managed PostgreSQL with pgvector pre-installed and connection pooling via Supavisor.

### Connection Architecture

```
# .env.local
DATABASE_URL=postgresql://user:pass@db.supabase.co:6543/postgres?schema=public&sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://user:pass@db.supabase.co:5432/postgres?schema=public&sslmode=require
```

- **DATABASE_URL**: Pooled connection (port 6543) for application
- **DIRECT_URL**: Direct connection (port 5432) for Prisma migrations

### Prisma Configuration

Dual URL support in prisma/schema.prisma:

```prisma
datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DIRECT_URL")
  extensions = [pgvector(map: "vector")]
}
```

### Supabase Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL         # https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY    # Public anon key for client auth
SUPABASE_SERVICE_ROLE_KEY        # Admin key for server operations
SUPABASE_CA_CERT                 # Optional: Full SSL verification
```

## Consequences

### Positive

- **Managed Service**: Automatic backups, SSL/TLS, security patches
- **Built-in Pooling**: Supavisor handles connection pooling for serverless
- **pgvector Pre-installed**: Vector search ready without extra setup
- **Vercel Integration**: Automatic environment variable provisioning
- **Developer Experience**: No local PostgreSQL installation needed
- **Scalability**: Auto-scaling storage and compute

### Negative

- **Vendor Lock-in**: Database tied to Supabase platform
- **Latency**: Network roundtrips to cloud (vs. local PostgreSQL)
- **Cost**: Supabase pricing scales with storage/bandwidth (current: free tier sufficient)
- **Complexity**: SSL certificate management and pooler configuration

### Mitigations

- Export data regularly to local backups
- Monitor costs via Supabase dashboard
- Document connection troubleshooting steps
- Use Prisma's dual-URL pattern for flexible migrations

## Related

- ADR 0028: PostgreSQL + pgvector migration (local setup)
- ADR 0052: Vercel deployment configuration
- ADR 0033: RAG semantic search architecture
