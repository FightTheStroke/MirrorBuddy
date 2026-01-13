# MirrorBuddy Troubleshooting Guide

> Solutions to common development and deployment issues

---

## Table of Contents

- [Quick Diagnosis](#quick-diagnosis)
- [Azure OpenAI Issues](#azure-openai-issues)
- [Database Issues](#database-issues)
- [Voice Session Issues](#voice-session-issues)
- [Build & Development Issues](#build--development-issues)
- [Ollama Issues](#ollama-issues)
- [Environment Configuration](#environment-configuration)
- [Getting Help](#getting-help)

---

## Quick Diagnosis

**Find your issue by symptom:**

| Symptom | Likely Cause | Quick Fix | Section |
|---------|--------------|-----------|---------|
| "API key is invalid" | Wrong credentials or endpoint | Check `.env.local` matches Azure Portal | [Azure OpenAI](#azure-openai-issues) |
| Voice button does nothing | Missing Realtime API config | Verify `AZURE_OPENAI_REALTIME_*` vars | [Voice Sessions](#voice-session-issues) |
| "Deployment not found" | Wrong deployment name | Check Azure Portal deployment name | [Azure OpenAI](#azure-openai-issues) |
| Database connection failed | PostgreSQL not running | Start PostgreSQL: `brew services start postgresql` | [Database](#database-issues) |
| "pgvector extension not found" | pgvector not installed | Install: `brew install pgvector` (macOS) | [Database](#database-issues) |
| Prisma errors on startup | Schema out of sync | Run: `npx prisma generate && npx prisma db push` | [Database](#database-issues) |
| Microphone not working | Browser permissions denied | Enable mic in browser settings | [Voice Sessions](#voice-session-issues) |
| Voice cuts out after 5 sec | Wrong audio format | Check sample rate: 24000 Hz, PCM16 | [Voice Sessions](#voice-session-issues) |
| WebSocket connection failed | Not using HTTPS in prod | Deploy with HTTPS or use localhost | [Voice Sessions](#voice-session-issues) |
| Build fails with TS errors | Stale TypeScript cache | Run: `npm run typecheck` then fix errors | [Build & Development](#build--development-issues) |
| `npm install` fails | Package conflicts | Delete `node_modules` & `package-lock.json`, reinstall | [Build & Development](#build--development-issues) |
| Ollama connection refused | Ollama not running | Start: `ollama serve` | [Ollama](#ollama-issues) |
| "Model not found" (Ollama) | Model not pulled | Pull model: `ollama pull llama3.2` | [Ollama](#ollama-issues) |
| Environment variable ignored | Wrong file name | Use `.env.local` (not `.env`) | [Environment](#environment-configuration) |
| AI responses are slow | Using Ollama without GPU | Switch to Azure OpenAI or add GPU | [Ollama](#ollama-issues) |

---

## Azure OpenAI Issues

### Authentication & Connection

#### Problem: "API key is invalid" or "401 Unauthorized"

**Cause:** Wrong API key or endpoint URL

**Solution:**
1. Verify credentials match Azure Portal:
   ```bash
   # In Azure Portal → Your OpenAI Resource → Keys and Endpoint
   # Copy EXACTLY as shown
   ```

2. Check `.env.local` format:
   ```bash
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
   AZURE_OPENAI_API_KEY=your-key-here
   ```

3. **Common mistakes:**
   - Missing `https://` in endpoint
   - Extra `/` at end of endpoint
   - Using OpenAI API key instead of Azure OpenAI key
   - Key from wrong Azure subscription

4. Test connection:
   ```bash
   curl https://your-resource.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-08-01-preview \
     -H "api-key: your-key" \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"test"}]}'
   ```

#### Problem: "Deployment not found" or "404 Not Found"

**Cause:** Deployment name in code doesn't match Azure Portal

**Solution:**
1. List your actual deployments:
   ```bash
   # In Azure Portal → Your OpenAI Resource → Model deployments
   ```

2. Match `.env.local` to deployment names:
   ```bash
   AZURE_OPENAI_DEPLOYMENT=gpt-4o              # For chat
   AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime  # For voice
   ```

3. **IMPORTANT:** Use deployment name, NOT model name:
   - ✅ Correct: `gpt-4o` (your deployment name)
   - ❌ Wrong: `gpt-4o-2024-08-06` (model ID)

---

### Preview vs GA API (CRITICAL)

> ⚠️ **This is the #1 cause of "voice works but no audio plays"**

#### Problem: Voice connects but audio never plays

**Cause:** Code expects wrong event names for your API version

**Background:** Azure has TWO versions with DIFFERENT event names:

| Aspect | Preview API | GA API |
|--------|-------------|--------|
| Deployment | `gpt-4o-realtime-preview` | `gpt-realtime` |
| URL Path | `/openai/realtime` | `/openai/v1/realtime` |
| Audio event | `response.audio.delta` | `response.output_audio.delta` |
| Transcript event | `response.audio_transcript.delta` | `response.output_audio_transcript.delta` |

**Solution:**
1. Check your deployment name in Azure Portal
2. Our code handles BOTH formats automatically (see `src/server/realtime-proxy.ts:61`)
3. If you modify voice code, ALWAYS handle both event names:
   ```typescript
   case 'response.output_audio.delta':  // GA API
   case 'response.audio.delta':         // Preview API
     playAudio(event.delta);
     break;
   ```

**Reference:** See `docs/technical/AZURE_REALTIME_API.md` for full details

---

### Voice/Realtime API Configuration

#### Problem: Voice button doesn't appear or is disabled

**Cause:** Missing Realtime API environment variables

**Solution:**
1. Ensure ALL three vars are set:
   ```bash
   AZURE_OPENAI_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
   AZURE_OPENAI_REALTIME_API_KEY=your-key
   AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime
   ```

2. Verify deployment exists in Azure Portal

3. Restart dev server after changing `.env.local`

#### Problem: "Invalid value: 'gpt-4o-transcribe'. Supported values are: 'whisper-1'"

**Cause:** Using wrong transcription model in Realtime API

**Solution:**
- Realtime API ONLY supports `whisper-1` for transcription
- `gpt-4o-transcribe` is only for `/audio/transcriptions` endpoint
- Our code uses correct model (`src/lib/hooks/use-voice-session.ts:524`)

**Reference:** See `docs/claude/voice-api.md` → "Trascrizione Audio" section

#### Problem: Voice session config fails with "Invalid session"

**Cause:** Wrong format for Preview vs GA API

**Solution:**
1. For Preview API (`gpt-4o-realtime-preview`):
   ```typescript
   {
     type: 'session.update',
     session: {
       voice: 'alloy',  // FLAT in session
       instructions: '...',
       input_audio_format: 'pcm16',
       turn_detection: { type: 'server_vad', ... }
     }
   }
   ```

2. For GA API (`gpt-realtime`):
   - Format may differ (see Azure docs)
   - Our proxy auto-detects and adjusts

3. Check proxy logs for exact error:
   ```bash
   # Dev server shows WebSocket proxy logs
   npm run dev
   ```

---

### Model Availability & Cost

#### Problem: "Model 'gpt-realtime-mini' not found"

**Cause:** Model not deployed in your Azure resource

**Solution:**
1. Deploy via Azure Portal or CLI:
   ```bash
   az cognitiveservices account deployment create \
     --resource-group rg-virtualbpm-prod \
     --name aoai-virtualbpm-prod \
     --deployment-name gpt-realtime-mini \
     --model-name gpt-realtime-mini \
     --model-version 2025-12-15 \
     --sku-name Standard \
     --sku-capacity 1
   ```

2. Update `.env.local`:
   ```bash
   AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime-mini
   ```

#### Choosing Between Models

| Use Case | Model | Cost/min | When to Use |
|----------|-------|----------|-------------|
| Tutoring, Onboarding | `gpt-realtime-mini` | ~$0.03-0.05 | **Recommended** - 90% cheaper |
| Emotional support | `gpt-realtime` | ~$0.30 | When nuance matters |
| Testing | `gpt-realtime-mini` | ~$0.03-0.05 | Always use for dev |

**Reference:** See `docs/claude/voice-api.md` → "Modelli Disponibili" for full comparison

---

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `"Deployment not found"` | Wrong deployment name | Match Azure Portal exactly |
| `"Invalid api-version"` | Using Preview param on GA | Remove `api-version` for GA |
| `"Invalid model"` | Using `model=` on Preview | Use `deployment=` for Preview |
| `"Rate limit exceeded"` | Too many requests | Check Azure quota, add delay |
| `"Content filtered"` | Response blocked by filter | Review content policy settings |
| `"Insufficient quota"` | Tokens per minute exceeded | Increase TPM in deployment |

---

### Debugging Checklist

1. **Test basic connection first:**
   ```bash
   # Use test-voice page
   npm run dev
   # Navigate to http://localhost:3000/test-voice
   ```

2. **Check browser console:** Look for WebSocket errors

3. **Check server logs:** See proxy connection logs in terminal

4. **Verify all env vars:**
   ```bash
   # Should print all values
   node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.AZURE_OPENAI_ENDPOINT)"
   ```

5. **Test deployments directly:**
   ```bash
   curl "https://your-resource.openai.azure.com/openai/deployments?api-version=2024-08-01-preview" \
     -H "api-key: your-key"
   ```

---

### Related Documentation

- **Full API reference:** `docs/technical/AZURE_REALTIME_API.md`
- **Voice configuration:** `docs/claude/voice-api.md`
- **Setup guide:** `SETUP.md` → "Azure OpenAI Configuration"

---

## Database Issues

### Connection & Setup

#### Problem: "Database connection failed" or "Can't reach database server"

**Cause:** PostgreSQL not running or wrong connection string

**Solution:**

1. **Check if PostgreSQL is running:**
   ```bash
   # macOS (Homebrew)
   brew services list
   brew services start postgresql@15

   # Linux (systemd)
   sudo systemctl status postgresql
   sudo systemctl start postgresql

   # Docker
   docker ps | grep postgres
   docker start mirrorbuddy-postgres
   ```

2. **Verify connection string format:**
   ```bash
   # .env.local
   # PostgreSQL (production)
   DATABASE_URL="postgresql://username:password@localhost:5432/mirrorbuddy"

   # SQLite (development - default)
   DATABASE_URL="file:./dev.db"
   ```

3. **Test connection manually:**
   ```bash
   # PostgreSQL
   psql -U username -d mirrorbuddy -h localhost

   # If using Docker
   docker exec -it mirrorbuddy-postgres psql -U mirrorbuddy
   ```

4. **Common connection string mistakes:**
   - Missing `postgresql://` prefix (not `postgres://`)
   - Wrong port (default: 5432)
   - Database name doesn't exist (create with `createdb mirrorbuddy`)
   - Password contains special chars (URL-encode: `@` → `%40`, `#` → `%23`)
   - Using quotes around the entire URL in `.env.local` (correct: `DATABASE_URL="postgresql://..."`)

#### Problem: "Error: P1001: Can't reach database server at `localhost:5432`"

**Cause:** PostgreSQL listening on different port or interface

**Solution:**
1. Check PostgreSQL config:
   ```bash
   # Find config file
   psql -U postgres -c "SHOW config_file"

   # Check listen_addresses and port
   grep "listen_addresses" /opt/homebrew/var/postgresql@15/postgresql.conf
   grep "^port" /opt/homebrew/var/postgresql@15/postgresql.conf
   ```

2. Update connection string:
   ```bash
   DATABASE_URL="postgresql://user:pass@127.0.0.1:5433/mirrorbuddy"  # If on port 5433
   ```

3. Ensure PostgreSQL accepts local connections:
   ```bash
   # Check pg_hba.conf allows local connections
   # Should have: local   all   all   trust
   cat /opt/homebrew/var/postgresql@15/pg_hba.conf
   ```

---

### pgvector Extension

#### Problem: "pgvector extension not found" or "type `vector` does not exist"

**Cause:** pgvector extension not installed in PostgreSQL

**Solution:**

1. **Install pgvector:**
   ```bash
   # macOS (Homebrew)
   brew install pgvector

   # Ubuntu/Debian
   sudo apt-get install postgresql-15-pgvector

   # From source
   git clone https://github.com/pgvector/pgvector.git
   cd pgvector
   make
   sudo make install
   ```

2. **Enable extension in database:**
   ```sql
   -- Connect to your database
   psql -U username -d mirrorbuddy

   -- Enable extension
   CREATE EXTENSION IF NOT EXISTS vector;

   -- Verify installation
   SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
   ```

3. **Run migrations:**
   ```bash
   npx prisma db push
   # Or for production
   npx prisma migrate deploy
   ```

#### Problem: pgvector installed but still getting "type `vector` does not exist"

**Cause:** Extension installed but not enabled in your specific database

**Solution:**
1. Enable extension in the correct database:
   ```bash
   # List databases
   psql -U username -c "\l"

   # Connect to MirrorBuddy database specifically
   psql -U username -d mirrorbuddy -c "CREATE EXTENSION IF NOT EXISTS vector;"
   ```

2. Verify extension is in correct database:
   ```bash
   psql -U username -d mirrorbuddy -c "SELECT extname FROM pg_extension WHERE extname = 'vector';"
   ```

#### Understanding pgvector Usage

**When is pgvector needed?**
- **PostgreSQL mode:** Required for RAG (Knowledge Hub) vector search
- **SQLite mode:** Not needed - uses JavaScript cosine similarity

**How MirrorBuddy detects pgvector:**
```typescript
// Automatic detection in src/lib/rag/pgvector-utils.ts
if (DATABASE_URL.startsWith('postgresql://')) {
  // Check if pgvector extension exists
  // If available: Use native vector search (fast)
  // If not available: Fall back to JSON vectors + JS similarity (slower)
}
```

**Check pgvector status:**
- Go to Settings → AI Provider → Diagnostics
- Look for "pgvector Status" section
- Should show: `available: true`, `version: 0.7.0`, `indexType: ivfflat/hnsw`

---

### SQLite vs PostgreSQL

#### When to Use Each

| Aspect | SQLite | PostgreSQL |
|--------|--------|------------|
| **Use Case** | Development, small deployments | Production, multiple users |
| **Setup** | Zero config | Requires server |
| **Performance** | Fast for single user | Scales with load |
| **Vector Search** | JS fallback (slower) | Native pgvector (fast) |
| **Migrations** | `db push` | `migrate deploy` |
| **Backup** | Copy `.db` file | `pg_dump` |
| **Max Size** | ~281 TB (practical: few GB) | Unlimited |

#### Switching from SQLite to PostgreSQL

**Steps:**
1. **Export data from SQLite:**
   ```bash
   # Option 1: Use Prisma's built-in migration
   npx prisma migrate diff \
     --from-schema-datasource prisma/schema.prisma \
     --to-schema-datamodel prisma/schema.prisma \
     --script > migration.sql
   ```

2. **Update `prisma/schema.prisma`:**
   ```prisma
   datasource db {
     provider = "postgresql"  // Change from "sqlite"
   }
   ```

3. **Update `.env.local`:**
   ```bash
   DATABASE_URL="postgresql://username:password@localhost:5432/mirrorbuddy"
   ```

4. **Create PostgreSQL database:**
   ```bash
   createdb mirrorbuddy
   ```

5. **Run migrations:**
   ```bash
   npx prisma generate
   npx prisma db push  # Or: npx prisma migrate deploy
   ```

6. **Install pgvector (optional but recommended):**
   ```bash
   brew install pgvector
   psql -d mirrorbuddy -c "CREATE EXTENSION vector;"
   ```

**⚠️ Data Loss Warning:** SQLite → PostgreSQL migration doesn't preserve data. For production, export data first:
```bash
# Export all data as JSON
npx prisma studio  # Manually export tables
# OR write custom script to copy data
```

#### Switching from PostgreSQL to SQLite (e.g., for testing)

**Steps:**
1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "sqlite"
   }
   ```

2. Update `.env.local`:
   ```bash
   DATABASE_URL="file:./dev.db"
   ```

3. Run migrations:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

---

### Prisma Migrations

#### Problem: "Prisma schema out of sync" or "Error: @prisma/client did not initialize yet"

**Cause:** Database schema doesn't match `prisma/schema.prisma`

**Solution:**
1. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Push schema changes to database:**
   ```bash
   # Development (SQLite or PostgreSQL)
   npx prisma db push

   # Production (PostgreSQL only - creates migration history)
   npx prisma migrate deploy
   ```

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

#### Problem: "Migration failed" or "P3006: Migration `20240101_init` failed to apply"

**Cause:** Database state conflicts with migration

**Solution:**

**Option 1: Reset database (⚠️ DELETES ALL DATA):**
```bash
npx prisma migrate reset
# Drops database, recreates, runs all migrations
```

**Option 2: Resolve migration manually:**
```bash
# Mark migration as applied (if already partially applied)
npx prisma migrate resolve --applied 20240101_init

# OR mark as rolled back
npx prisma migrate resolve --rolled-back 20240101_init

# Then deploy again
npx prisma migrate deploy
```

**Option 3: Fresh start (development only):**
```bash
# SQLite: Delete database file
rm prisma/dev.db
npx prisma db push

# PostgreSQL: Drop and recreate database
dropdb mirrorbuddy
createdb mirrorbuddy
npx prisma db push
```

#### Understanding Migration Commands

| Command | Use Case | Safety | When to Use |
|---------|----------|--------|-------------|
| `prisma generate` | Update Prisma Client | ✅ Safe | After schema changes, always run first |
| `prisma db push` | Sync schema to DB | ⚠️ No history | Development, prototyping |
| `prisma migrate dev` | Create migration | ⚠️ Can prompt reset | Development, before commit |
| `prisma migrate deploy` | Apply migrations | ✅ Production-safe | Production, CI/CD |
| `prisma migrate reset` | Drop & recreate DB | ❌ DELETES DATA | Development only |
| `prisma db seed` | Load seed data | ✅ Safe | After reset or fresh DB |

**Workflow:**
```bash
# 1. Edit prisma/schema.prisma
# 2. Generate client
npx prisma generate

# 3. Push to database
# Development:
npx prisma db push

# Production:
npx prisma migrate dev --name add_new_field
npx prisma migrate deploy
```

#### Problem: "Column does not exist" after adding field to schema

**Cause:** Schema updated but database not synced

**Solution:**
```bash
# Quick fix (development)
npx prisma db push

# Proper fix (production)
npx prisma migrate dev --name add_column_name
git add prisma/migrations
git commit -m "Add column to schema"
```

---

### Performance & Optimization

#### Problem: Slow queries or database timeouts

**Cause:** Missing indexes or inefficient queries

**Solution:**

1. **Check query performance:**
   ```bash
   # Enable query logging in .env.local
   DATABASE_URL="postgresql://...?connection_limit=10&pool_timeout=20"
   ```

2. **Add indexes for common queries:**
   ```prisma
   // In prisma/schema.prisma
   model StudySession {
     id        String   @id
     userId    String
     startedAt DateTime

     @@index([userId])           // ✅ Existing
     @@index([startedAt])        // ✅ Existing
     @@index([userId, startedAt]) // Add if querying both together
   }
   ```

3. **Optimize pgvector search:**
   ```sql
   -- Check if vector index exists
   SELECT indexname FROM pg_indexes WHERE tablename = 'ContentEmbedding';

   -- Create HNSW index (faster than IVFFlat for accuracy)
   CREATE INDEX IF NOT EXISTS embedding_hnsw_idx
   ON "ContentEmbedding"
   USING hnsw (embedding vector_cosine_ops);
   ```

4. **Connection pool settings:**
   ```bash
   # .env.local
   DATABASE_URL="postgresql://user:pass@localhost:5432/mirrorbuddy?connection_limit=10"
   ```

#### pgvector Search Performance

**Symptoms:**
- Knowledge Hub slow to search
- RAG queries timeout
- High CPU usage during vector search

**Solutions:**

1. **Ensure proper index type:**
   ```sql
   -- HNSW (recommended): Better accuracy, faster queries
   CREATE INDEX embedding_hnsw_idx ON "ContentEmbedding"
   USING hnsw (embedding vector_cosine_ops);

   -- IVFFlat: Lower memory, good for large datasets
   CREATE INDEX embedding_ivfflat_idx ON "ContentEmbedding"
   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
   ```

2. **Check index is being used:**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM search_similar_embeddings(
     'user_id',
     '[0.1,0.2,...]'::vector(1536),
     10,
     0.5,
     NULL,
     NULL
   );
   -- Should show "Index Scan using embedding_hnsw_idx"
   ```

3. **Tune search parameters:**
   ```typescript
   // In Knowledge Hub code
   const results = await searchEmbeddings({
     userId,
     vector,
     limit: 5,          // Reduce if slow
     minSimilarity: 0.7, // Increase to filter more
   });
   ```

---

### Docker PostgreSQL Setup

#### Running PostgreSQL in Docker

**Quick start:**
```bash
# Create docker-compose.yml
cat > docker-compose.yml <<EOF
version: '3.8'
services:
  postgres:
    image: pgvector/pgvector:pg15
    container_name: mirrorbuddy-postgres
    environment:
      POSTGRES_USER: mirrorbuddy
      POSTGRES_PASSWORD: mirrorbuddy
      POSTGRES_DB: mirrorbuddy
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
EOF

# Start
docker-compose up -d

# Connection string
DATABASE_URL="postgresql://mirrorbuddy:mirrorbuddy@localhost:5432/mirrorbuddy"
```

**Benefits:**
- ✅ pgvector pre-installed
- ✅ Isolated from system PostgreSQL
- ✅ Easy to reset: `docker-compose down -v`
- ✅ Consistent across team members

---

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `P1001: Can't reach database server` | PostgreSQL not running | `brew services start postgresql` |
| `P1003: Database does not exist` | Database not created | `createdb mirrorbuddy` |
| `P3006: Migration failed` | Schema conflict | `npx prisma migrate reset` (dev only) |
| `P2002: Unique constraint failed` | Duplicate key | Check for existing data, adjust seed |
| `type "vector" does not exist` | pgvector not installed/enabled | `CREATE EXTENSION vector;` |
| `relation "ContentEmbedding" does not exist` | Table not created | `npx prisma db push` |
| `@prisma/client did not initialize` | Client not generated | `npx prisma generate` |
| `Error: ECONNREFUSED ::1:5432` | PostgreSQL listening on IPv4 only | Use `127.0.0.1` instead of `localhost` |

---

### Debugging Checklist

1. **Verify database is running:**
   ```bash
   # PostgreSQL
   pg_isready -h localhost -p 5432

   # SQLite
   ls -lh prisma/dev.db  # Should exist
   ```

2. **Test connection:**
   ```bash
   # PostgreSQL
   psql $DATABASE_URL -c "SELECT 1"

   # SQLite
   sqlite3 prisma/dev.db "SELECT 1"
   ```

3. **Check Prisma Client:**
   ```bash
   npx prisma -v
   npx prisma validate
   ```

4. **Regenerate everything:**
   ```bash
   rm -rf node_modules/.prisma
   npx prisma generate
   npx prisma db push
   ```

5. **Check pgvector status (PostgreSQL only):**
   ```bash
   psql $DATABASE_URL -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
   ```

---

### Related Documentation

- **Setup guide:** `SETUP.md` → "Database Configuration"
- **Schema reference:** `prisma/schema.prisma`
- **pgvector utilities:** `src/lib/rag/pgvector-utils.ts`
- **Prisma docs:** https://www.prisma.io/docs

---

## Voice Session Issues

*Coming soon in next subtask*

---

## Build & Development Issues

*Coming soon in next subtask*

---

## Ollama Issues

*Coming soon in next subtask*

---

## Environment Configuration

*Coming soon in next subtask*

---

## Getting Help

*Coming soon in next subtask*

---

**See also:** [SETUP.md](SETUP.md) | [README.md](README.md) | [CONTRIBUTING.md](CONTRIBUTING.md)
