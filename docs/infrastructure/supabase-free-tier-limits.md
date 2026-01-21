# Supabase Free Tier Limits - MirrorBuddy

**Generated:** 2026-01-21
**Project:** MirrorBuddy (vifitbzkkhrzkdkuttha)
**Region:** eu-west-1 (West EU - Ireland)
**Status:** ACTIVE_HEALTHY
**PostgreSQL Version:** 17.6.1.063

## Audit Method

This audit was performed using:

1. **Supabase CLI** (`supabase` v2.72.7)
   - `supabase projects list` - Project details and status
   - `supabase projects api-keys` - API key verification

2. **Direct Database Queries** (via Prisma)
   - `pg_database_size()` - Current database size
   - `pg_tables` - Table inventory

3. **Supabase Management API**
   - Project configuration
   - Plan tier verification

## Current Usage (as of 2026-01-21)

| Metric | Current | Limit | % Used | Status |
|--------|---------|-------|--------|--------|
| **Database Size** | 19.34 MB | 500 MB | 3.87% | ✅ OK |
| **Tables** | 61 tables | Unlimited | - | ✅ OK |

**Remaining:** 480.66 MB

## Supabase Free Tier Limits

### Database

| Resource | Free Tier Limit | Notes |
|----------|-----------------|-------|
| **Database Size** | 500 MB | Total PostgreSQL database size including indexes |
| **Database Rows** | Unlimited | No hard limit on row count |
| **Connections** | Direct: 60<br>Pooler: 200 | PgBouncer pooler recommended for web apps |
| **Backups** | None | Manual dumps via `pg_dump` only |
| **Point-in-Time Recovery** | Not available | Pro tier feature |

### Storage

| Resource | Free Tier Limit | Notes |
|----------|-----------------|-------|
| **Storage Size** | 1 GB | For file uploads (images, PDFs, etc.) |
| **Bandwidth** | 2 GB | Egress bandwidth per month |
| **File Size** | 50 MB | Maximum single file upload size |

### Edge Functions

| Resource | Free Tier Limit | Notes |
|----------|-----------------|-------|
| **Invocations** | 500,000/month | Function calls |
| **Execution Time** | 10s per invocation | Maximum duration |

### Authentication

| Resource | Free Tier Limit | Notes |
|----------|-----------------|-------|
| **Monthly Active Users (MAU)** | 50,000 | Users who log in during the month |
| **Social OAuth Providers** | Unlimited | Google, GitHub, etc. |
| **Email Auth** | Included | No extra cost |

### Realtime

| Resource | Free Tier Limit | Notes |
|----------|-----------------|-------|
| **Concurrent Connections** | 200 | WebSocket connections |
| **Messages** | 2 million/month | Broadcast + presence messages |
| **Max Message Size** | 250 KB | Per message |

### API Requests

| Resource | Free Tier Limit | Notes |
|----------|-----------------|-------|
| **API Requests** | Unlimited | REST API and GraphQL (PostgREST) |
| **Rate Limiting** | None by default | Can configure custom limits |

### Infrastructure

| Resource | Free Tier Limit | Notes |
|----------|-----------------|-------|
| **Projects** | 2 active projects | Per organization |
| **Regions** | All available | No region restrictions |
| **Custom Domain** | Not available | Pro tier feature |
| **Uptime SLA** | None | Best effort, no guarantees |
| **Support** | Community only | Email/priority support on Pro+ |

## Monitoring & Alerts

### Database Size Monitoring

**Script:** `scripts/get-db-size-simple.ts`

```bash
npx tsx scripts/get-db-size-simple.ts
```

**Output:**
```
Current size: 19.34 MB
Free tier limit: 500 MB
Percentage used: 3.87%
Remaining: 480.66 MB
```

### Recommended Alerts

Set up monitoring when:

- **Database size > 400 MB (80%)** - Warning threshold
- **Database size > 475 MB (95%)** - Critical threshold
- **Storage > 800 MB (80%)** - Warning threshold
- **MAU > 40,000 (80%)** - Warning threshold

### Usage Dashboard

Access via Supabase Dashboard:
- **URL:** https://supabase.com/dashboard/project/vifitbzkkhrzkdkuttha
- **Usage:** Settings → Usage
- **Database:** Database → Database Size

## Upgrade Path

When limits are reached:

| Plan | Price | Key Upgrades |
|------|-------|--------------|
| **Pro** | $25/month | 8 GB database, 100 GB storage, 50 GB bandwidth, backups, PITR |
| **Team** | $599/month | 32 GB database, 200 GB storage, 250 GB bandwidth, priority support |
| **Enterprise** | Custom | Unlimited resources, SLA, dedicated support |

## Optimization Strategies

### Database Size Optimization

1. **Index Management**
   - Remove unused indexes
   - Use partial indexes where possible
   - Monitor index bloat: `supabase inspect db bloat --linked`

2. **Data Retention**
   - Implement data archival for old records
   - Delete soft-deleted records after grace period
   - Compress or summarize telemetry data

3. **Table Optimization**
   - Run `VACUUM ANALYZE` regularly
   - Consider partitioning large tables (logs, telemetry)
   - Use efficient data types (e.g., `bytea` for binary data)

4. **Query Optimization**
   - Use connection pooling (pgBouncer)
   - Optimize N+1 queries
   - Implement caching for frequently accessed data

### Storage Optimization

1. **Asset Compression**
   - Convert avatars to WebP format
   - Compress PDFs before upload
   - Use responsive image variants

2. **CDN Integration**
   - Move static assets to Vercel CDN
   - Use external storage for large files (S3, Cloudinary)

3. **Cleanup**
   - Delete orphaned files
   - Remove unused uploads
   - Implement retention policies

## Verification Commands

```bash
# List all projects
supabase projects list

# Get project details in JSON
supabase projects list --output json | jq '.[] | select(.ref=="vifitbzkkhrzkdkuttha")'

# Check database size
npx tsx scripts/get-db-size-simple.ts

# Inspect database bloat
supabase inspect db bloat --linked --output json

# Check API keys
supabase projects api-keys --project-ref vifitbzkkhrzkdkuttha

# Check connection pooler
supabase inspect db connections --linked
```

## References

- **Supabase Pricing:** https://supabase.com/pricing
- **Supabase CLI Docs:** https://supabase.com/docs/guides/cli
- **PostgreSQL Monitoring:** https://supabase.com/docs/guides/database/monitoring
- **Connection Pooling:** https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler

## Changelog

- **2026-01-21:** Initial audit via Supabase MCP/CLI (Task T1-03, Plan 64)
  - Current database size: 19.34 MB / 500 MB (3.87% used)
  - 61 tables in public schema
  - All Free tier limits documented
