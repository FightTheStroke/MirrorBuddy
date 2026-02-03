# MirrorBuddy Troubleshooting Guide

> Solutions to common development and deployment issues
> Last updated: 20 Gennaio 2026, 11:30 CET

---

## Table of Contents

- [Quick Diagnosis](#quick-diagnosis)
- [Azure OpenAI Issues](#azure-openai-issues)
- [Database Issues](#database-issues)
- [Voice Session Issues](#voice-session-issues)
- [Build & Development Issues](#build--development-issues)
- [Ollama Issues](#ollama-issues)
- [Environment Configuration](#environment-configuration)
- [E2E Testing Issues](#e2e-testing-issues)
- [Security & Encryption Issues](#security--encryption-issues)
- [Getting Help](#getting-help)

---

## Quick Diagnosis

**Find your issue by symptom:**

| Symptom                                | Likely Cause                  | Quick Fix                                              | Section                                           |
| -------------------------------------- | ----------------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| "API key is invalid"                   | Wrong credentials or endpoint | Check `.env.local` matches Azure Portal                | [Azure OpenAI](#azure-openai-issues)              |
| Voice button does nothing              | Missing Realtime API config   | Verify `AZURE_OPENAI_REALTIME_*` vars                  | [Voice Sessions](#voice-session-issues)           |
| "Deployment not found"                 | Wrong deployment name         | Check Azure Portal deployment name                     | [Azure OpenAI](#azure-openai-issues)              |
| Database connection failed             | PostgreSQL not running        | Start PostgreSQL: `brew services start postgresql`     | [Database](#database-issues)                      |
| "pgvector extension not found"         | pgvector not installed        | Install: `brew install pgvector` (macOS)               | [Database](#database-issues)                      |
| Prisma errors on startup               | Schema out of sync            | Run: `npx prisma generate && npx prisma migrate dev`   | [Database](#database-issues)                      |
| Microphone not working                 | Browser permissions denied    | Enable mic in browser settings                         | [Voice Sessions](#voice-session-issues)           |
| Voice cuts out after 5 sec             | Wrong audio format            | Check sample rate: 24000 Hz, PCM16                     | [Voice Sessions](#voice-session-issues)           |
| WebSocket connection failed            | Not using HTTPS in prod       | Deploy with HTTPS or use localhost                     | [Voice Sessions](#voice-session-issues)           |
| Build fails with TS errors             | Stale TypeScript cache        | Run: `npm run typecheck` then fix errors               | [Build & Development](#build--development-issues) |
| `npm install` fails                    | Package conflicts             | Delete `node_modules` & `package-lock.json`, reinstall | [Build & Development](#build--development-issues) |
| Ollama connection refused              | Ollama not running            | Start: `ollama serve`                                  | [Ollama](#ollama-issues)                          |
| "Model not found" (Ollama)             | Model not pulled              | Pull model: `ollama pull llama3.2`                     | [Ollama](#ollama-issues)                          |
| Environment variable ignored           | Wrong file name               | Use `.env.local` (not `.env`)                          | [Environment](#environment-configuration)         |
| AI responses are slow                  | Using Ollama without GPU      | Switch to Azure OpenAI or add GPU                      | [Ollama](#ollama-issues)                          |
| "Page should have main landmark" (E2E) | Wall component blocking       | Update `global-setup.ts`                               | [E2E Testing](#e2e-testing-issues)                |
| "Unable to verify first certificate"   | Missing Supabase CA cert      | Set `SUPABASE_CA_CERT`                                 | [Security](#security--encryption-issues)          |
| "TOKEN_ENCRYPTION_KEY required"        | Missing encryption key        | Generate 32+ char key                                  | [Security](#security--encryption-issues)          |

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
   curl https://your-resource.openai.azure.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-08-01-preview \
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
    AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o-mini        # For chat
    AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime  # For voice
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

| Aspect           | Preview API                       | GA API                                   |
| ---------------- | --------------------------------- | ---------------------------------------- |
| Deployment       | `gpt-4o-realtime-preview`         | `gpt-realtime`                           |
| URL Path         | `/openai/realtime`                | `/openai/v1/realtime`                    |
| Audio event      | `response.audio.delta`            | `response.output_audio.delta`            |
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
    AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime
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

| Use Case             | Model               | Cost/min    | When to Use                   |
| -------------------- | ------------------- | ----------- | ----------------------------- |
| Tutoring, Onboarding | `gpt-realtime-mini` | ~$0.03-0.05 | **Recommended** - 90% cheaper |
| Emotional support    | `gpt-realtime`      | ~$0.30      | When nuance matters           |
| Testing              | `gpt-realtime-mini` | ~$0.03-0.05 | Always use for dev            |

**Reference:** See `docs/claude/voice-api.md` → "Modelli Disponibili" for full comparison

---

### Common Error Messages

| Error                    | Cause                      | Solution                       |
| ------------------------ | -------------------------- | ------------------------------ |
| `"Deployment not found"` | Wrong deployment name      | Match Azure Portal exactly     |
| `"Invalid api-version"`  | Using Preview param on GA  | Remove `api-version` for GA    |
| `"Invalid model"`        | Using `model=` on Preview  | Use `deployment=` for Preview  |
| `"Rate limit exceeded"`  | Too many requests          | Check Azure quota, add delay   |
| `"Content filtered"`     | Response blocked by filter | Review content policy settings |
| `"Insufficient quota"`   | Tokens per minute exceeded | Increase TPM in deployment     |

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
if (DATABASE_URL.startsWith("postgresql://")) {
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

| Aspect            | SQLite                         | PostgreSQL                 |
| ----------------- | ------------------------------ | -------------------------- |
| **Use Case**      | Development, small deployments | Production, multiple users |
| **Setup**         | Zero config                    | Requires server            |
| **Performance**   | Fast for single user           | Scales with load           |
| **Vector Search** | JS fallback (slower)           | Native pgvector (fast)     |
| **Migrations**    | `db push`                      | `migrate deploy`           |
| **Backup**        | Copy `.db` file                | `pg_dump`                  |
| **Max Size**      | ~281 TB (practical: few GB)    | Unlimited                  |

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

| Command                 | Use Case             | Safety              | When to Use                            |
| ----------------------- | -------------------- | ------------------- | -------------------------------------- |
| `prisma generate`       | Update Prisma Client | ✅ Safe             | After schema changes, always run first |
| `prisma db push`        | Sync schema to DB    | ⚠️ No history       | Development, prototyping               |
| `prisma migrate dev`    | Create migration     | ⚠️ Can prompt reset | Development, before commit             |
| `prisma migrate deploy` | Apply migrations     | ✅ Production-safe  | Production, CI/CD                      |
| `prisma migrate reset`  | Drop & recreate DB   | ❌ DELETES DATA     | Development only                       |
| `prisma db seed`        | Load seed data       | ✅ Safe             | After reset or fresh DB                |

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
     limit: 5, // Reduce if slow
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

| Error                                        | Cause                             | Solution                               |
| -------------------------------------------- | --------------------------------- | -------------------------------------- |
| `P1001: Can't reach database server`         | PostgreSQL not running            | `brew services start postgresql`       |
| `P1003: Database does not exist`             | Database not created              | `createdb mirrorbuddy`                 |
| `P3006: Migration failed`                    | Schema conflict                   | `npx prisma migrate reset` (dev only)  |
| `P2002: Unique constraint failed`            | Duplicate key                     | Check for existing data, adjust seed   |
| `type "vector" does not exist`               | pgvector not installed/enabled    | `CREATE EXTENSION vector;`             |
| `relation "ContentEmbedding" does not exist` | Table not created                 | `npx prisma db push`                   |
| `@prisma/client did not initialize`          | Client not generated              | `npx prisma generate`                  |
| `Error: ECONNREFUSED ::1:5432`               | PostgreSQL listening on IPv4 only | Use `127.0.0.1` instead of `localhost` |

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

### HTTPS Requirement (Critical for Production)

#### Problem: Microphone doesn't work on mobile or non-localhost

**Cause:** `navigator.mediaDevices.getUserMedia()` requires **secure context** (HTTPS)

**Browser Security Rules:**

- ✅ `localhost:3000` / `127.0.0.1:3000` → Works (localhost exempt)
- ✅ `https://your-domain.com` → Works
- ❌ `http://192.168.x.x:3000` → **Blocked** (insecure IP)
- ❌ `http://your-domain.com` → **Blocked** (insecure HTTP)

**Solution for Development:**

1. **Option 1: Use localhost on device browser** (desktop only)

   ```bash
   npm run dev
   # Open http://localhost:3000 in same machine
   ```

2. **Option 2: HTTPS tunnel** (for mobile testing)

   ```bash
   # Using Cloudflare Tunnel (recommended)
   cloudflared tunnel --url http://localhost:3000

   # Or using ngrok
   ngrok http 3000
   ```

3. **Option 3: Local HTTPS with mkcert**

   ```bash
   # Install mkcert
   brew install mkcert
   mkcert -install

   # Generate cert for local IP
   mkcert localhost 192.168.1.100 127.0.0.1

   # Use in Next.js (requires custom server)
   ```

**Solution for Production:**

- Deploy with HTTPS (Vercel, Netlify, etc. handle this automatically)
- Ensure WebSocket proxy also uses `wss://` (not `ws://`)

**Reference:** See `docs/claude/voice-api.md` → "Requisito HTTPS per Microfono"

---

### Microphone Permissions

#### Problem: "Permission denied" or microphone button does nothing

**Cause:** Browser blocked microphone access

**Solution:**

1. **Check browser permissions:**
   - **Chrome:** `chrome://settings/content/microphone`
   - **Safari:** Preferences → Websites → Microphone
   - **Firefox:** `about:preferences#privacy` → Permissions → Microphone

2. **Reset site permissions:**

   ```
   Chrome: Click 🔒 in address bar → Site settings → Microphone → Allow
   Safari: Safari → Settings for This Website → Microphone → Allow
   ```

3. **Test microphone works:**

   ```bash
   # Navigate to test page
   http://localhost:3000/test-voice

   # Should see microphone icon and be able to click it
   ```

4. **Common mistakes:**
   - Using HTTP on non-localhost (see HTTPS section above)
   - Denying permission on first request (must reset in browser settings)
   - Using incorrect device (select right mic in device picker)

#### Problem: "NotFoundError: Requested device not found"

**Cause:** No microphone connected or wrong device ID

**Solution:**

1. **List available devices:**

   ```typescript
   navigator.mediaDevices.enumerateDevices().then((devices) => {
     const mics = devices.filter((d) => d.kind === "audioinput");
     console.log("Microphones:", mics);
   });
   ```

2. **Use device selector:**
   - Our test-voice page has a device dropdown
   - Select correct microphone from list
   - Setting is saved to localStorage

3. **Check system settings:**
   - macOS: System Settings → Sound → Input
   - Windows: Settings → System → Sound → Input

---

### Audio Format Issues

#### Problem: Voice connects but audio is distorted/choppy

**Cause:** Wrong sample rate or audio format

**Critical Requirements:**

- **Sample rate:** 24000 Hz (24kHz) - **MUST match Azure API**
- **Format:** PCM16 (16-bit linear PCM)
- **Channels:** Mono (1 channel)

**Solution:**

1. **Verify AudioContext sample rate:**

   ```typescript
   // CORRECT - forces 24kHz
   const audioContext = new AudioContext({ sampleRate: 24000 });
   console.log("Sample rate:", audioContext.sampleRate); // Must be 24000

   // WRONG - uses browser default (often 48kHz)
   const audioContext = new AudioContext();
   ```

2. **Our implementation** (in `use-voice-session.ts`):

   ```typescript
   // Line ~300-310
   audioContextRef.current = new AudioContext({ sampleRate: 24000 });
   ```

3. **If you modify voice code:**
   - ALWAYS create AudioContext with `{ sampleRate: 24000 }`
   - NEVER use default sample rate
   - Check `audioContext.sampleRate` in console if issues persist

**Reference:** See `docs/technical/AZURE_REALTIME_API.md` → "Audio Format" and "Resampling 48kHz → 24kHz"

#### Problem: User speaks but audio never reaches Azure

**Cause:** Microphone capturing at wrong sample rate or format

**Solution:**

1. **Check capture format in use-voice-session.ts:**

   ```typescript
   // MediaRecorder setup (line ~400-420)
   const mediaRecorder = new MediaRecorder(stream, {
     mimeType: "audio/webm;codecs=opus", // Browser captures here
   });

   // Then resampled to 24kHz PCM16 for Azure
   ```

2. **Verify resampling works:**
   - Check console for "Resampling audio" messages
   - Should see downsampling from 48kHz → 24kHz
   - No warnings about unsupported format

3. **Test with test-voice page:**
   ```bash
   npm run dev
   # Go to /test-voice
   # Enable "Show Debug Logs"
   # Speak and watch console for audio data flow
   ```

---

### WebSocket Connection Issues

#### Problem: "WebSocket connection failed" or "Connection closed unexpectedly"

**Cause:** Proxy not running, wrong URL, or network issues

**Solution:**

1. **Verify proxy is running:**

   ```bash
   # Dev server starts proxy automatically on port 3001
   npm run dev

   # You should see:
   # "Realtime proxy listening on ws://localhost:3001"
   ```

2. **Check WebSocket URL format:**

   ```typescript
   // CORRECT (development)
   ws://localhost:3001

   // CORRECT (production with HTTPS)
   wss://your-domain.com/api/realtime-proxy

   // WRONG
   http://localhost:3001  // Not a WebSocket URL
   ws://localhost:3000    // Wrong port (3000 is Next.js, not proxy)
   ```

3. **Inspect WebSocket in browser:**
   - Chrome DevTools → Network → WS tab
   - Should see connection to `ws://localhost:3001`
   - Check "Messages" tab to see events flowing

4. **Check proxy logs:**
   ```bash
   # Terminal running npm run dev shows proxy logs
   # Look for:
   # "Client connected"
   # "Azure connected"
   # "Error:" messages
   ```

#### Problem: WebSocket connects but no events received

**Cause:** Event names mismatch (Preview vs GA API) or session.update failed

**Solution:**

1. **Check which API version you're using:**

   ```bash
   # Look at your deployment name in .env.local
   AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime  # GA API
   # or
   AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime-preview  # Preview API
   ```

2. **Event name differences** (see [Azure OpenAI Issues](#preview-vs-ga-api-critical) above):

   | Event Type  | Preview API                       | GA API                                   |
   | ----------- | --------------------------------- | ---------------------------------------- |
   | Audio chunk | `response.audio.delta`            | `response.output_audio.delta`            |
   | Transcript  | `response.audio_transcript.delta` | `response.output_audio_transcript.delta` |

3. **Our code handles both** (in `use-voice-session.ts:575-616`):

   ```typescript
   switch (event.type) {
     case "response.output_audio.delta": // GA API
     case "response.audio.delta": // Preview API
       playAudio(event.delta);
       break;
   }
   ```

4. **If you modify event handlers:**
   - ALWAYS add both event name cases
   - Test with your actual deployment
   - Check `docs/technical/AZURE_REALTIME_API.md` → "CRITICAL: Preview vs GA API"

#### Problem: Connection works initially but closes after 5-10 seconds

**Cause:** Missing session.update or invalid session config

**Solution:**

1. **Ensure session.update is sent after connection:**

   ```typescript
   // In use-voice-session.ts (line ~515-538)
   ws.onopen = () => {
     // MUST send session.update immediately
     ws.send(JSON.stringify({
       type: 'session.update',
       session: {
         voice: 'alloy',
         instructions: '...',
         input_audio_format: 'pcm16',
         turn_detection: { type: 'server_vad', ... }
       }
     }));
   };
   ```

2. **Check session config format:**
   - Preview API: `voice` is flat in `session`
   - GA API: format may differ (see Azure docs)
   - Our proxy auto-detects (`src/server/realtime-proxy.ts:61`)

3. **Verify in WebSocket messages:**
   - Network → WS → Messages tab
   - Look for `session.update` message sent
   - Look for `session.updated` response from Azure

---

### Audio Echo / Feedback Loop

#### Problem: Audio plays back through microphone causing echo

**Cause:** System audio routing captures speaker output as microphone input

**Solution:**

1. **Use headphones** (simplest solution)
   - Prevents speaker output from being captured by mic
   - Recommended for all voice testing

2. **Check system audio settings:**
   - macOS: Ensure "Use ambient noise reduction" is OFF
   - Windows: Disable "Listen to this device"

3. **Disable barge-in during onboarding** (if echo persists):

   ```typescript
   // In voice session config
   disableBargeIn: true; // Prevents auto-interruption
   ```

4. **For MirrorBuddy conversation:**
   - Code already handles this (`src/components/ambient-audio/onboarding-modal.tsx`)
   - Onboarding uses `disableBargeIn: true`
   - Normal sessions use barge-in for natural conversation

**Reference:** See `docs/technical/AZURE_REALTIME_API.md` → "Barge-in (Auto-Interruption)"

---

### Device Selection

#### Problem: Want to use external microphone or specific speaker

**Solution:**

Our test-voice page includes device selection:

1. **Navigate to test page:**

   ```bash
   npm run dev
   # Go to http://localhost:3000/test-voice
   ```

2. **Select devices:**
   - **Microphone dropdown:** Choose input device
   - **Speaker dropdown:** Choose output device
   - Selections saved to localStorage

3. **Implementation reference:**
   - Code in `src/app/test-voice/page.tsx`
   - Uses `enumerateDevices()` API
   - Creates MediaStreamAudioSourceNode with specific device

4. **Troubleshooting device issues:**
   ```typescript
   // List all devices in console
   navigator.mediaDevices.enumerateDevices().then((devices) => {
     console.log(devices.filter((d) => d.kind === "audioinput")); // Mics
     console.log(devices.filter((d) => d.kind === "audiooutput")); // Speakers
   });
   ```

**Reference:** See `docs/technical/AZURE_REALTIME_API.md` → "Device Selection (Microphone and Speaker)"

---

### Common Error Messages

| Error                                                 | Cause                       | Solution                                                                                     |
| ----------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------- |
| `"NotAllowedError: Permission denied"`                | Mic permission denied       | Reset in browser settings (see [Microphone Permissions](#microphone-permissions))            |
| `"NotSupportedError: secure context"`                 | Using HTTP on non-localhost | Use HTTPS or localhost (see [HTTPS Requirement](#https-requirement-critical-for-production)) |
| `"NotFoundError: Device not found"`                   | Microphone not connected    | Check system settings, plug in mic                                                           |
| `"WebSocket connection failed"`                       | Proxy not running           | Ensure `npm run dev` is running                                                              |
| `"Invalid value: 'gpt-4o-transcribe'"`                | Wrong transcription model   | Use `whisper-1` only (see [Azure OpenAI Issues](#voice-realtime-api-configuration))          |
| `"Session update failed"`                             | Wrong session format        | Check Preview vs GA format (see above)                                                       |
| `AudioContext.createMediaStreamSource: NotFoundError` | No audio track in stream    | Check microphone constraints                                                                 |

---

### Debugging Checklist

1. **Test with test-voice page first:**

   ```bash
   npm run dev
   # Navigate to http://localhost:3000/test-voice
   # Follow on-screen instructions
   ```

2. **Check browser console:**
   - Look for WebSocket connection messages
   - Check for "Permission denied" or HTTPS warnings
   - Verify sample rate: should log "24000"

3. **Inspect WebSocket traffic:**
   - Chrome DevTools → Network → WS tab
   - Click connection → Messages
   - Verify `session.update` sent and `session.updated` received
   - Check for audio.delta events when speaking

4. **Check proxy logs:**
   - Terminal running `npm run dev`
   - Look for "Client connected" and "Azure connected"
   - Check for error messages from Azure

5. **Verify environment variables:**

   ```bash
   node -e "require('dotenv').config({path:'.env.local'}); console.log({
     endpoint: process.env.AZURE_OPENAI_REALTIME_ENDPOINT,
     deployment: process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT,
     hasKey: !!process.env.AZURE_OPENAI_REALTIME_API_KEY
   })"
   ```

6. **Test microphone in browser:**
   - Go to https://mictests.com
   - Verify microphone works in browser
   - If fails, it's a system/browser issue, not MirrorBuddy

---

### Related Documentation

- **Full API reference:** `docs/technical/AZURE_REALTIME_API.md`
- **Voice configuration:** `docs/claude/voice-api.md`
- **Test page implementation:** `src/app/test-voice/page.tsx`
- **Voice hook:** `src/lib/hooks/use-voice-session.ts`
- **WebSocket proxy:** `src/server/realtime-proxy.ts`

---

## Build & Development Issues

### Dependency Problems

#### Problem: `npm install` fails with conflicts or errors

**Cause:** Package version conflicts, corrupted cache, or platform-specific issues

**Solution:**

1. **Clean install (most common fix):**

   ```bash
   # Delete everything and start fresh
   rm -rf node_modules package-lock.json
   npm cache clean --force
   npm install
   ```

2. **Check Node.js version:**

   ```bash
   node -v  # Should be >= 18.0.0
   npm -v   # Should be >= 8.0.0
   ```

   If outdated:

   ```bash
   # Update Node.js via nvm (recommended)
   nvm install 18
   nvm use 18

   # Or via Homebrew (macOS)
   brew upgrade node
   ```

3. **Platform-specific issues:**

   ```bash
   # macOS: If sharp or other native modules fail
   brew install vips

   # Linux: Missing build tools
   sudo apt-get install build-essential python3

   # Windows: Use Node.js installer, not WSL npm
   ```

4. **Peer dependency warnings:**
   ```bash
   # Usually safe to ignore, but if breaking:
   npm install --legacy-peer-deps
   ```

#### Problem: "Cannot find module '@prisma/client'"

**Cause:** Prisma Client not generated after schema changes

**Solution:**

```bash
# Generate Prisma Client
npx prisma generate

# If still fails, regenerate everything
rm -rf node_modules/.prisma node_modules/@prisma
npm install
npx prisma generate
```

**When to regenerate:**

- After pulling schema changes from git
- After modifying `prisma/schema.prisma`
- After switching branches
- If seeing "Type 'PrismaClient' is not defined"

#### Problem: "Module not found" after installing new package

**Cause:** Next.js dev server not aware of new dependencies

**Solution:**

```bash
# Restart dev server
# Press Ctrl+C to stop
npm run dev

# Or use reboot script (kills port 3000 processes first)
npm run reboot
```

---

### Build Errors

#### Problem: `npm run build` fails with TypeScript errors

**Cause:** Type errors in code, outdated type definitions, or incorrect tsconfig

**Solution:**

1. **Check for actual type errors:**

   ```bash
   # Run type checker to see all errors
   npm run typecheck

   # Fix reported errors in code
   ```

2. **Common type error fixes:**

   ```typescript
   // ❌ Wrong: Implicit any
   function process(data) {}

   // ✅ Correct: Explicit types
   function process(data: UserData): void {}

   // ❌ Wrong: Unsafe property access
   const name = user.profile.name;

   // ✅ Correct: Optional chaining
   const name = user?.profile?.name;
   ```

3. **Update type definitions:**

   ```bash
   # Update all @types packages
   npm update @types/node @types/react @types/react-dom
   ```

4. **Clear TypeScript cache:**

   ```bash
   # Remove build cache
   rm -rf .next
   npm run build
   ```

5. **Check tsconfig.json is correct:**
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "skipLibCheck": true, // Skip type checking of .d.ts files
       "forceConsistentCasingInFileNames": true
     }
   }
   ```

#### Problem: Build fails with "JavaScript heap out of memory"

**Cause:** Large build requires more memory than default Node.js limit

**Solution:**

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Or add to package.json scripts
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
  }
}
```

#### Problem: "Error: ENOSPC: System limit for number of file watchers reached"

**Cause:** Linux system limit on file watchers (common in Docker/WSL)

**Solution:**

```bash
# Increase limit temporarily
sudo sysctl -w fs.inotify.max_user_watches=524288

# Make permanent
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### Problem: Build succeeds but app crashes on startup

**Cause:** Runtime environment missing required variables or dependencies

**Solution:**

1. **Check environment variables:**

   ```bash
   # Ensure .env.local exists and has required vars
   cat .env.local

   # Required for production:
   DATABASE_URL="..."
   AZURE_OPENAI_ENDPOINT="..."
   AZURE_OPENAI_API_KEY="..."
   ```

2. **Check server logs:**

   ```bash
   npm run build
   npm start
   # Look for error messages in console
   ```

3. **Verify Prisma is ready:**
   ```bash
   npx prisma generate
   npx prisma db push  # Or migrate deploy for production
   npm start
   ```

---

### Cache Issues

#### Problem: Changes not appearing in browser after editing code

**Cause:** Stale Next.js cache or browser cache

**Solution:**

1. **Clear Next.js build cache:**

   ```bash
   rm -rf .next
   npm run dev
   ```

2. **Hard refresh browser:**
   - Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Safari: `Cmd+Option+R`
   - Firefox: `Ctrl+F5`

3. **Disable browser cache in DevTools:**
   - Chrome DevTools → Network tab → "Disable cache" checkbox
   - Keep DevTools open while developing

4. **Clear Service Worker (if using PWA features):**
   ```bash
   # In browser console
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(r => r.unregister());
   });
   ```

#### Problem: "Module build failed" after switching branches

**Cause:** Cached modules from different branch

**Solution:**

```bash
# Nuclear option: Clear everything
rm -rf .next node_modules package-lock.json
npm install
npx prisma generate
npm run dev
```

#### Problem: Hot reload not working (changes require manual refresh)

**Cause:** File watcher not detecting changes or WSL2 issue

**Solution:**

1. **Check file watcher:**

   ```bash
   # In another terminal
   lsof | grep node  # macOS/Linux

   # Should show file watches on your project directory
   ```

2. **WSL2 specific fix:**

   ```bash
   # In WSL .bashrc or .zshrc
   export CHOKIDAR_USEPOLLING=true

   # Restart terminal and dev server
   npm run dev
   ```

3. **Reduce watched files (if project is huge):**
   ```js
   // next.config.js
   module.exports = {
     webpack: (config) => {
       config.watchOptions = {
         poll: 1000,
         aggregateTimeout: 300,
       };
       return config;
     },
   };
   ```

---

### TypeScript Errors

#### Problem: "Cannot find module" for internal imports

**Cause:** Path aliases not configured or tsconfig not loaded

**Solution:**

1. **Check tsconfig.json has path aliases:**

   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./src/*"],
         "@/components/*": ["./src/components/*"],
         "@/lib/*": ["./src/lib/*"]
       }
     }
   }
   ```

2. **Restart TypeScript server in VSCode:**
   - `Cmd+Shift+P` → "TypeScript: Restart TS Server"

3. **Check import path is correct:**

   ```typescript
   // ✅ Correct
   import { Button } from "@/components/ui/button";

   // ❌ Wrong
   import { Button } from "components/ui/button";
   import { Button } from "src/components/ui/button";
   ```

#### Problem: "Type 'X' is not assignable to type 'Y'"

**Cause:** Type mismatch, often from API changes or Prisma schema changes

**Solution:**

1. **Check Prisma types are up to date:**

   ```bash
   npx prisma generate
   npm run typecheck
   ```

2. **Use type assertions carefully:**

   ```typescript
   // ❌ Avoid: Unsafe type assertion
   const user = data as User;

   // ✅ Better: Type guard
   function isUser(data: unknown): data is User {
     return typeof data === "object" && data !== null && "id" in data;
   }
   if (isUser(data)) {
     // data is User here
   }

   // ✅ Best: Zod schema validation
   import { z } from "zod";
   const UserSchema = z.object({ id: z.string(), name: z.string() });
   const user = UserSchema.parse(data);
   ```

3. **Check for Prisma relation type issues:**
   ```typescript
   // If error: "Type 'User' is not assignable..."
   // After changing Prisma schema:
   npx prisma generate
   # Restart TypeScript server in editor
   ```

#### Problem: "Property 'X' does not exist on type 'Y'"

**Cause:** Type definitions out of sync with actual data structure

**Solution:**

1. **Update type definitions:**

   ```typescript
   // In src/types/index.ts
   export interface User {
     id: string;
     name: string;
     email: string;
     // Add missing property
     avatarUrl?: string; // ← Add this
   }
   ```

2. **Check Prisma schema matches:**

   ```prisma
   // prisma/schema.prisma
   model User {
     id        String  @id
     name      String
     email     String
     avatarUrl String? // ← Ensure this exists if using it
   }
   ```

   Then regenerate:

   ```bash
   npx prisma generate
   ```

3. **Use optional chaining if property might not exist:**
   ```typescript
   // Instead of: user.profile.avatarUrl
   const avatar = user.profile?.avatarUrl ?? "/default-avatar.png";
   ```

---

### Linting Issues

#### Problem: ESLint errors blocking development

**Cause:** Code style violations or incorrect ESLint config

**Solution:**

1. **Auto-fix most issues:**

   ```bash
   npm run lint -- --fix
   ```

2. **Check ESLint config:**

   ```bash
   # Verify eslint.config.js exists
   cat eslint.config.js
   ```

3. **Ignore specific rules (use sparingly):**

   ```typescript
   // Disable for one line
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const data: any = response;

   // Disable for file
   /* eslint-disable @typescript-eslint/no-explicit-any */
   ```

4. **Common fixes:**

   ```typescript
   // Error: "React must be in scope"
   // ✅ Fix: Not needed in Next.js 13+ (auto-imported)

   // Error: "'X' is assigned but never used"
   // ✅ Fix: Remove unused variable or prefix with _
   const _unusedVar = value;

   // Error: "Missing return type on function"
   // ✅ Fix: Add explicit return type
   function getData(): Promise<User[]> {}
   ```

---

### Port Already in Use

#### Problem: "Port 3000 is already in use"

**Cause:** Previous dev server still running or another app using port

**Solution:**

1. **Use reboot script (kills port 3000 processes):**

   ```bash
   npm run reboot
   ```

2. **Manual kill:**

   ```bash
   # macOS/Linux
   lsof -ti:3000 | xargs kill -9

   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

3. **Change port:**

   ```bash
   # Temporary
   PORT=3001 npm run dev

   # Or in package.json
   {
     "scripts": {
       "dev": "next dev -p 3001"
     }
   }
   ```

---

### Debugging Checklist

1. **Start with clean slate:**

   ```bash
   rm -rf .next node_modules package-lock.json
   npm install
   npx prisma generate
   npm run typecheck
   npm run build
   ```

2. **Check all verifications pass:**

   ```bash
   npm run lint
   npm run typecheck
   npm run build
   # npm run test  # If tests exist
   ```

3. **Verify environment:**

   ```bash
   node -v  # >= 18
   npm -v   # >= 8
   cat .env.local  # Has required vars
   ```

4. **Check logs for specific errors:**

   ```bash
   # Build logs
   npm run build 2>&1 | tee build.log

   # Dev server logs
   npm run dev 2>&1 | tee dev.log
   ```

5. **Test in production mode:**
   ```bash
   npm run build
   npm start
   # Check for runtime errors
   ```

---

### Common Error Messages

| Error                                           | Cause                    | Solution                                                          |
| ----------------------------------------------- | ------------------------ | ----------------------------------------------------------------- | -------------- |
| `"Cannot find module '@prisma/client'"`         | Prisma not generated     | `npx prisma generate`                                             |
| `"Module not found: Can't resolve '@/lib/...'"` | Path alias issue         | Check `tsconfig.json` paths, restart TS server                    |
| `"JavaScript heap out of memory"`               | Large build              | `NODE_OPTIONS='--max-old-space-size=4096' npm run build`          |
| `"Port 3000 already in use"`                    | Server already running   | `npm run reboot` or `lsof -ti:3000                                | xargs kill -9` |
| `"Type error: Property 'X' does not exist"`     | Type definition outdated | Update types in `src/types/index.ts`                              |
| `"ENOSPC: System limit for file watchers"`      | Linux/WSL limit          | `sudo sysctl -w fs.inotify.max_user_watches=524288`               |
| `"Module build failed: UnhandledSchemeError"`   | Webpack config issue     | Clear `.next` cache, restart                                      |
| `"digital envelope routines::unsupported"`      | Node.js version mismatch | Use Node.js 18+ or set `NODE_OPTIONS='--openssl-legacy-provider'` |

---

### Related Documentation

- **Setup guide:** `SETUP.md`
- **Project structure:** `ARCHITECTURE.md`
- **Contributing:** `CONTRIBUTING.md`
- **Package scripts:** `package.json`

---

## Ollama Issues

### Installation & Setup

#### Problem: "ollama: command not found"

**Cause:** Ollama not installed or not in PATH

**Solution:**

1. **Install Ollama:**

   ```bash
   # macOS (Homebrew)
   brew install ollama

   # Linux
   curl -fsSL https://ollama.com/install.sh | sh

   # Windows
   # Download from https://ollama.com/download/windows
   ```

2. **Verify installation:**

   ```bash
   ollama --version
   # Should show: ollama version 0.x.x
   ```

3. **Check PATH (if command not found after install):**

   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   export PATH="$PATH:/usr/local/bin"

   # Reload shell
   source ~/.bashrc  # or source ~/.zshrc
   ```

#### Problem: Ollama installed but won't start

**Cause:** Port conflict, permission issues, or service not enabled

**Solution:**

1. **Start Ollama service:**

   ```bash
   # macOS/Linux: Start manually
   ollama serve

   # macOS: Start as background service
   brew services start ollama

   # Linux: Enable systemd service
   sudo systemctl enable ollama
   sudo systemctl start ollama
   ```

2. **Check if running:**

   ```bash
   # Should show process
   ps aux | grep ollama

   # Test endpoint
   curl http://localhost:11434/api/tags
   ```

3. **Check for port conflicts:**

   ```bash
   # See what's using port 11434
   lsof -i :11434

   # If another service is using it, stop it or change Ollama port
   OLLAMA_HOST=0.0.0.0:11435 ollama serve
   ```

4. **Check logs:**

   ```bash
   # macOS (Homebrew service)
   tail -f ~/Library/Logs/Ollama/server.log

   # Linux (systemd)
   sudo journalctl -u ollama -f
   ```

---

### Connection Issues

#### Problem: "Connection refused" or "Failed to connect to Ollama"

**Cause:** Ollama not running or wrong URL configuration

**Solution:**

1. **Verify Ollama is running:**

   ```bash
   # Check service status
   brew services list | grep ollama  # macOS
   sudo systemctl status ollama      # Linux

   # Start if not running
   ollama serve
   ```

2. **Test connection manually:**

   ```bash
   # Should return JSON list of models
   curl http://localhost:11434/api/tags

   # If fails, Ollama isn't running or listening on different port
   ```

3. **Check `.env.local` configuration:**

   ```bash
   # Should be exactly this for local Ollama
   OLLAMA_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.2
   ```

   **Common mistakes:**
   - ❌ `OLLAMA_URL=localhost:11434` (missing `http://`)
   - ❌ `OLLAMA_URL=http://127.0.0.1:11434` (use `localhost` for consistency)
   - ❌ `OLLAMA_URL=https://localhost:11434` (should be `http`, not `https`)

4. **Restart dev server after changing `.env.local`:**

   ```bash
   # Stop (Ctrl+C) and restart
   npm run dev
   ```

5. **Check firewall (if remote Ollama):**

   ```bash
   # macOS: Allow Ollama through firewall
   # System Settings → Network → Firewall → Options

   # Linux: Open port 11434
   sudo ufw allow 11434
   ```

#### Problem: Connection works but requests timeout

**Cause:** Model too large for available memory or CPU too slow

**Solution:**

1. **Check system resources:**

   ```bash
   # Monitor while making request
   # macOS
   top -o MEM

   # Linux
   htop

   # Look for ollama process using high CPU/RAM
   ```

2. **Use smaller model:**

   ```bash
   # Current model size
   ollama list

   # Try smaller alternatives:
   ollama pull llama3.2:1b      # ~1GB  (fastest, lowest quality)
   ollama pull llama3.2         # ~2GB  (recommended balance)
   ollama pull llama3.2:8b      # ~4.5GB (slower, better quality)
   ```

3. **Update `.env.local` to smaller model:**

   ```bash
   OLLAMA_MODEL=llama3.2:1b  # Or llama3.2
   ```

4. **Increase timeout in code** (if needed):
   ```typescript
   // In src/lib/ai/providers.ts
   const response = await fetch(ollamaUrl, {
     // ...
     signal: AbortSignal.timeout(60000), // 60 seconds (default: 30)
   });
   ```

---

### Model Management

#### Problem: "Model not found" or "model 'llama3.2' not found"

**Cause:** Model not downloaded locally

**Solution:**

1. **List available models:**

   ```bash
   ollama list
   # Shows all downloaded models
   ```

2. **Pull required model:**

   ```bash
   # Default recommended model
   ollama pull llama3.2

   # Or specific size variant
   ollama pull llama3.2:1b   # Smallest, fastest
   ollama pull llama3.2:3b   # Medium
   ollama pull llama3.2:8b   # Larger, better quality
   ```

3. **Verify model name matches `.env.local`:**

   ```bash
   # Check what's in config
   cat .env.local | grep OLLAMA_MODEL

   # Must match exactly what ollama list shows
   # Example: if ollama list shows "llama3.2:latest"
   OLLAMA_MODEL=llama3.2:latest
   ```

4. **Download time:**
   - `llama3.2:1b` (~1GB): 2-5 minutes
   - `llama3.2` (~2GB): 5-10 minutes
   - `llama3.2:8b` (~4.5GB): 15-30 minutes

   **Monitor progress:**

   ```bash
   ollama pull llama3.2
   # Shows download progress: █████░░░░░  45%
   ```

#### Problem: Model download fails or is stuck

**Cause:** Network issues, disk space, or corrupted download

**Solution:**

1. **Check disk space:**

   ```bash
   df -h
   # Ensure at least 5-10GB free for models
   ```

2. **Check network:**

   ```bash
   # Test connectivity to Ollama registry
   curl -I https://registry.ollama.ai
   ```

3. **Delete and re-download:**

   ```bash
   # Remove model
   ollama rm llama3.2

   # Clear cache (if needed)
   rm -rf ~/.ollama/models/*

   # Re-download
   ollama pull llama3.2
   ```

4. **Try different mirror/CDN:**
   ```bash
   # Set custom registry (if available)
   export OLLAMA_MODELS=/path/to/custom/location
   ollama pull llama3.2
   ```

#### Choosing the Right Model

| Model                | Size   | RAM Needed | Speed       | Quality         | Use Case                        |
| -------------------- | ------ | ---------- | ----------- | --------------- | ------------------------------- |
| `llama3.2:1b`        | ~1GB   | 2-4GB      | ⚡ Fastest  | ⭐ Basic        | Testing, demos                  |
| `llama3.2` (default) | ~2GB   | 4-8GB      | ⚡⚡ Fast   | ⭐⭐⭐ Good     | **Recommended for MirrorBuddy** |
| `llama3.2:3b`        | ~3GB   | 6-10GB     | ⚡⚡ Medium | ⭐⭐⭐⭐ Better | More nuanced responses          |
| `llama3.2:8b`        | ~4.5GB | 8-16GB     | 🐌 Slow     | ⭐⭐⭐⭐⭐ Best | High quality, production        |

**For MirrorBuddy development:**

- Use `llama3.2` (2GB) - best balance of speed and quality
- Avoid `1b` variant - too low quality for educational content
- Use `8b` only if you have good hardware (16GB+ RAM, dedicated GPU)

---

### Performance Issues

#### Problem: Ollama responses are very slow

**Cause:** Model too large, no GPU acceleration, or insufficient RAM

**Solution:**

1. **Check if GPU is being used:**

   ```bash
   # macOS (Metal)
   ollama pull llama3.2
   # Should show: "using Metal" during inference

   # Linux with NVIDIA GPU
   nvidia-smi
   # Should show ollama process using GPU

   # If no GPU detected, Ollama falls back to CPU (much slower)
   ```

2. **Use smaller model:**

   ```bash
   # Switch to faster model
   ollama pull llama3.2:1b

   # Update .env.local
   OLLAMA_MODEL=llama3.2:1b
   ```

3. **Check available RAM:**

   ```bash
   # macOS
   vm_stat | perl -ne '/page size of (\d+)/ and $size=$1; /Pages\s+([^:]+)[^\d]+(\d+)/ and printf("%-16s % 16.2f MB\n", "$1:", $2 * $size / 1048576);'

   # Linux
   free -h
   ```

   **RAM requirements:**
   - Model size + 2GB overhead minimum
   - Example: llama3.2 (2GB) needs 4-6GB available RAM

4. **Close other applications:**
   - Free up RAM by closing browsers, IDEs, etc.
   - Ollama performance degrades significantly with memory pressure

5. **Consider switching to Azure OpenAI:**
   - Much faster than local Ollama without GPU
   - Required for voice features anyway
   - See [SETUP.md](SETUP.md) → "Azure OpenAI Setup"

#### Problem: First request is slow, then faster

**Cause:** Normal behavior - model loading takes time

**Solution:**
This is expected:

- **First request:** 5-30 seconds (loading model into memory)
- **Subsequent requests:** 2-5 seconds (model already loaded)

**Keep Ollama warm:**

```bash
# Send periodic requests to keep model in memory
# Or use larger RAM to avoid model eviction
```

---

### Limitations & Differences from Azure OpenAI

#### Ollama vs Azure OpenAI

| Feature        | Ollama                     | Azure OpenAI           |
| -------------- | -------------------------- | ---------------------- |
| **Voice**      | ❌ Not supported           | ✅ Full support        |
| **Cost**       | Free                       | Pay-per-use            |
| **Speed**      | Slow (CPU) to Medium (GPU) | Fast                   |
| **Quality**    | Good to Very Good          | Excellent              |
| **Onboarding** | ❌ No voice                | ✅ Voice tutorial      |
| **Setup**      | Easy (local)               | Requires Azure account |
| **Privacy**    | ✅ Fully local             | Cloud-based            |
| **Offline**    | ✅ Works offline           | ❌ Requires internet   |

#### Features Not Available with Ollama

**Voice Features:**

- ❌ Voice onboarding tutorial
- ❌ Ambient audio conversations
- ❌ Voice commands

**Workaround:** Use Showcase Mode for full UI experience without API calls:

```bash
# Navigate to showcase mode
http://localhost:3000/showcase
# Or enable in Settings → "Modalità Showcase"
```

**Text Features Still Work:**

- ✅ Maestri chat (text only)
- ✅ Knowledge Hub
- ✅ Flashcards, Quizzes
- ✅ Mind maps
- ✅ Learning paths

#### Problem: Maestri responses lack personality compared to Azure

**Cause:** Smaller model, less training data, simpler prompt handling

**Solution:**

1. **Use larger model:**

   ```bash
   ollama pull llama3.2:8b
   OLLAMA_MODEL=llama3.2:8b
   ```

2. **Accept the trade-off:**
   - Ollama: Free, private, but less personality
   - Azure: Better quality, voice, but costs money

3. **For production, use Azure OpenAI** (recommended)

---

### Configuration & Environment

#### Problem: `.env.local` changes not taking effect

**Cause:** Dev server caches environment variables

**Solution:**

```bash
# Always restart after changing .env.local
# Press Ctrl+C to stop
npm run dev
```

#### Problem: Can't tell if using Ollama or Azure OpenAI

**Cause:** Not clear which provider is active

**Solution:**

1. **Check Settings → AI Provider → Diagnostics:**
   - Shows active provider (Azure OpenAI or Ollama)
   - Connection status
   - Model being used

2. **Check browser console:**
   - Look for log messages indicating provider
   - Example: "Using Ollama at http://localhost:11434"

3. **Check `.env.local` priority:**

   ```bash
   # If BOTH are configured, Azure OpenAI takes priority
   AZURE_OPENAI_ENDPOINT=...  # ← Used first
   OLLAMA_URL=...             # ← Fallback if Azure fails

   # To force Ollama, comment out Azure:
   # AZURE_OPENAI_ENDPOINT=...
   OLLAMA_URL=http://localhost:11434
   ```

---

### Common Error Messages

| Error                                     | Cause                           | Solution                                                                           |
| ----------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------- |
| `"ollama: command not found"`             | Ollama not installed            | Install: `brew install ollama` or `curl -fsSL https://ollama.com/install.sh \| sh` |
| `"Connection refused at localhost:11434"` | Ollama not running              | Start: `ollama serve` or `brew services start ollama`                              |
| `"Model 'llama3.2' not found"`            | Model not pulled                | Pull: `ollama pull llama3.2`                                                       |
| `"Out of memory"`                         | Model too large for RAM         | Use smaller model: `ollama pull llama3.2:1b`                                       |
| `"Request timeout"`                       | Model loading or inference slow | Wait for first request (up to 30s), use smaller model                              |
| `"Failed to load model"`                  | Corrupted download or disk full | Delete and re-pull: `ollama rm llama3.2 && ollama pull llama3.2`                   |
| `"Port 11434 already in use"`             | Another service using port      | Find and stop: `lsof -ti:11434 \| xargs kill -9`                                   |

---

### Debugging Checklist

1. **Verify Ollama is installed and running:**

   ```bash
   ollama --version
   ollama list
   curl http://localhost:11434/api/tags
   ```

2. **Check model is downloaded:**

   ```bash
   ollama list
   # Should show llama3.2 or your configured model
   ```

3. **Test model directly:**

   ```bash
   ollama run llama3.2 "Hello, how are you?"
   # Should get response from model
   ```

4. **Verify environment variables:**

   ```bash
   cat .env.local | grep OLLAMA
   # Should show:
   # OLLAMA_URL=http://localhost:11434
   # OLLAMA_MODEL=llama3.2
   ```

5. **Check MirrorBuddy connection:**
   - Go to Settings → AI Provider → Diagnostics
   - Click "Test Connection"
   - Should show "Connected to Ollama"

6. **Monitor Ollama logs:**

   ```bash
   # macOS
   tail -f ~/Library/Logs/Ollama/server.log

   # Linux
   sudo journalctl -u ollama -f

   # Manual run (shows logs in terminal)
   ollama serve
   ```

---

### Related Documentation

- **Setup guide:** `SETUP.md` → "Ollama Setup (Local)"
- **AI providers:** `src/lib/ai/providers.ts`
- **Ollama docs:** https://ollama.com/docs
- **Model library:** https://ollama.com/library

---

## Environment Configuration

### Understanding .env Files

#### Problem: Changes to `.env` not working or being ignored

**Cause:** Wrong file name or file not loaded by Next.js

**Solution:**

MirrorBuddy uses **`.env.local`** (NOT `.env`) for local development:

| File              | Purpose                                | Should I Edit?               |
| ----------------- | -------------------------------------- | ---------------------------- |
| `.env.example`    | Template with all variables documented | ❌ No - This is the template |
| `.env.local`      | **Your actual config** (gitignored)    | ✅ YES - Edit this file      |
| `.env`            | Not used in MirrorBuddy                | ❌ Don't create this         |
| `.env.production` | Deployment-specific (optional)         | Only for custom deployments  |

**Setup:**

1. Copy template to create your config:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in your values:

   ```bash
   # Open in editor
   nano .env.local
   # or
   code .env.local
   ```

3. **ALWAYS restart dev server after changes:**
   ```bash
   # Stop with Ctrl+C, then:
   npm run dev
   ```

**Common mistakes:**

- ❌ Editing `.env.example` instead of `.env.local`
- ❌ Creating `.env` instead of `.env.local`
- ❌ Forgetting to restart server after changes
- ❌ Committing `.env.local` to git (it's automatically ignored)

---

### Complete Configuration Reference

Below is every environment variable MirrorBuddy uses. See [`.env.example`](.env.example) for detailed comments and examples.

#### Required Variables (Minimum)

**For Azure OpenAI (Recommended):**

```bash
# Chat functionality
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-08-01-preview

# Voice functionality (if using voice features)
AZURE_OPENAI_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_REALTIME_API_KEY=your-api-key
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime

# Database
DATABASE_URL="file:./prisma/dev.db"
```

**For Ollama (100% local, no cloud, text only):**

```bash
# Ollama server (no Azure needed)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Database
DATABASE_URL="file:./prisma/dev.db"
```

**Note:** If BOTH Azure and Ollama are configured, Azure takes priority. Ollama is used as fallback.

#### Optional Variables

**RAG Embeddings (for Knowledge Hub search):**

```bash
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small
```

**Cost Optimization (mini model for non-critical features):**

```bash
AZURE_OPENAI_REALTIME_DEPLOYMENT_MINI=gpt-4o-mini-realtime
```

**Azure Cost Tracking (for Settings page cost display):**

```bash
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-service-principal-client-id
AZURE_CLIENT_SECRET=your-service-principal-secret
AZURE_SUBSCRIPTION_ID=your-subscription-id
```

**Google OAuth (for Calendar/Classroom sync):**

```bash
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-web-client-secret
```

**PostgreSQL (for production):**

```bash
DATABASE_URL="postgresql://user:password@host:5432/mirrorbuddy?sslmode=require"
```

---

### Configuration by Use Case

#### Local Development (Simplest)

**SQLite + Ollama (100% free, no cloud):**

```bash
# .env.local
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
DATABASE_URL="file:./prisma/dev.db"
```

**Limitations:**

- ❌ No voice features
- ✅ All text features work
- ✅ 100% local and private

**Setup:**

```bash
# Install and start Ollama
brew install ollama
ollama serve

# Pull model (in another terminal)
ollama pull llama3.2

# Start MirrorBuddy
cp .env.example .env.local
# Edit .env.local with above values
npm run dev
```

---

#### Local Development (Full Features)

**SQLite + Azure OpenAI (voice + text):**

```bash
# .env.local
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-08-01-preview

AZURE_OPENAI_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_REALTIME_API_KEY=your-api-key
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime

AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small

DATABASE_URL="file:./prisma/dev.db"
```

**Features:**

- ✅ Voice onboarding
- ✅ Ambient audio conversations
- ✅ All text features
- ✅ RAG search in Knowledge Hub

**Cost:** ~$5-20/month for development testing

---

#### Production Deployment

**PostgreSQL + Azure OpenAI + Cost Tracking:**

```bash
# .env.local (or Vercel environment variables)

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-08-01-preview

# Voice (with cost optimization)
AZURE_OPENAI_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_REALTIME_API_KEY=your-api-key
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime
AZURE_OPENAI_REALTIME_DEPLOYMENT_MINI=gpt-4o-mini-realtime

# RAG
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small

# Database (production PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/mirrorbuddy?sslmode=require"

# Cost tracking (optional)
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-service-principal-client-id
AZURE_CLIENT_SECRET=your-service-principal-secret
AZURE_SUBSCRIPTION_ID=your-subscription-id

# Google integration (optional)
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-web-client-secret
```

**Deployment platforms:**

- **Vercel:** Add variables in Project Settings → Environment Variables
- **Docker:** Pass via `--env-file .env.local` or `-e` flags
- **Other:** Ensure variables are available to Node.js process

---

### Testing Your Configuration

#### Quick Verification

```bash
# 1. Check .env.local exists and has values
cat .env.local

# 2. Verify variables are loaded
node -e "require('dotenv').config({path:'.env.local'}); console.log({
  azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
  ollamaUrl: process.env.OLLAMA_URL,
  database: process.env.DATABASE_URL
})"

# 3. Test database connection
npx prisma db push

# 4. Start dev server
npm run dev
```

#### In-App Diagnostics

1. **Start the app:**

   ```bash
   npm run dev
   ```

2. **Navigate to Settings:**

   ```
   http://localhost:3000/settings
   ```

3. **Check "AI Provider" section:**
   - Shows active provider (Azure OpenAI or Ollama)
   - Connection status
   - Available features
   - Voice availability

4. **Run diagnostics:**
   - Click "Test Connection" button
   - Should show green checkmarks for configured services

#### Manual API Tests

**Test Azure OpenAI:**

```bash
curl https://your-resource.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-08-01-preview \
  -H "api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50
  }'
```

**Test Ollama:**

```bash
curl http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2",
    "prompt": "Hello",
    "stream": false
  }'
```

**Test Database:**

```bash
# SQLite
sqlite3 prisma/dev.db "SELECT 1"

# PostgreSQL
psql $DATABASE_URL -c "SELECT 1"
```

---

### Common Configuration Mistakes

| Mistake                       | Symptom                | Fix                                                             |
| ----------------------------- | ---------------------- | --------------------------------------------------------------- |
| **Wrong file name**           | Variables ignored      | Use `.env.local`, not `.env`                                    |
| **Missing `https://`**        | "Invalid URL"          | Add `https://` to Azure endpoint                                |
| **Extra `/` at end**          | "404 Not Found"        | Remove trailing slash from endpoint                             |
| **Wrong deployment name**     | "Deployment not found" | Match Azure Portal deployment name exactly                      |
| **Not restarting server**     | Changes not applied    | Always restart: `npm run dev`                                   |
| **Wrong API version**         | "Invalid api-version"  | Use `2024-08-01-preview`                                        |
| **Using OpenAI key**          | "Unauthorized"         | Use Azure OpenAI key, not OpenAI.com key                        |
| **Quotes in URL**             | Parse error            | Use quotes around entire URL: `DATABASE_URL="postgresql://..."` |
| **Special chars in password** | Connection failed      | URL-encode password: `@` → `%40`, `#` → `%23`                   |
| **SQLite path relative**      | "Database not found"   | Use `file:./prisma/dev.db` (relative to project root)           |

---

### Security Best Practices

**DO:**

- ✅ Keep `.env.local` out of git (automatically ignored)
- ✅ Use different keys for dev/staging/production
- ✅ Rotate API keys periodically
- ✅ Use Azure RBAC to limit key permissions
- ✅ Store production secrets in platform secrets (Vercel, Azure Key Vault, etc.)

**DON'T:**

- ❌ Commit `.env.local` to git
- ❌ Share `.env.local` via email/Slack
- ❌ Use production keys in development
- ❌ Hardcode keys in source code
- ❌ Screenshot or log `.env.local` contents

**If keys are compromised:**

1. **Immediately rotate in Azure Portal:**
   - Azure Portal → Your OpenAI Resource → Keys and Endpoint
   - Click "Regenerate Key 1" (or Key 2 if using that)

2. **Update `.env.local`:**

   ```bash
   AZURE_OPENAI_API_KEY=new-regenerated-key
   ```

3. **Update production environment:**
   - Vercel: Project Settings → Environment Variables
   - Docker: Update secrets/env file

---

### Related Documentation

- **Template with full documentation:** [`.env.example`](.env.example)
- **Setup guide:** [`SETUP.md`](SETUP.md)
- **Azure OpenAI setup:** [`SETUP.md`](SETUP.md) → "Azure OpenAI Configuration"
- **Ollama setup:** [`SETUP.md`](SETUP.md) → "Ollama Setup (Local)"

---

## E2E Testing Issues

> See [ADR 0059](docs/adr/0059-e2e-test-setup-requirements.md) for full E2E test setup requirements.

### Flaky CI Navigation (net::ERR_ABORTED / timeouts)

#### Problem: E2E tests fail with `page.goto` or `page.reload` (ERR_ABORTED / timeout)

**Cause:** CI runners are slower; hydration or redirects can detach frames during navigation/reload.

**Solution:**

1. Avoid `page.reload()` in CI-sensitive tests. Re-navigate with explicit waits:

   ```typescript
   await page.goto(currentUrl, {
     waitUntil: "domcontentloaded",
     timeout: 120000,
   });
   await page.waitForLoadState("networkidle", { timeout: 90000 });
   ```

2. Use locale-aware navigation helper with retry for transient errors:

   ```typescript
   await localePage.goto("/welcome"); // handles retries + load-state waits
   ```

---

### A11y Quick Panel Flakiness (missing panel/close/toggles)

#### Problem: A11y panel elements not found or aria attributes missing in CI

**Cause:** Panel relies on client hydration; a single click can fire before handlers attach.

**Solution:**

1. Always open the panel via `openA11yPanel()` helper (retries + waits).
2. Add explicit visibility timeouts before aria assertions:

   ```typescript
   const { panel } = await openA11yPanel(page);
   await expect(panel).toBeVisible({ timeout: 30000 });
   await expect(panel).toHaveAttribute("aria-modal", "true");
   ```

3. For close button tests, ensure stability before click:

   ```typescript
   await expect(closeBtn).toBeVisible({ timeout: 30000 });
   await closeBtn.click({ timeout: 30000 });
   ```

---

### A11y Sections/Labels (aria-labelledby)

#### Problem: Sections have no aria-labelledby in CI tests

**Cause:** Panel content not fully rendered before assertions.

**Solution:**

1. Wait for section visibility before reading attributes.
2. Verify the referenced label exists:

   ```typescript
   await expect(sections.first()).toBeVisible({ timeout: 30000 });
   const labelledBy = await section.getAttribute("aria-labelledby");
   await expect(page.locator(`#${labelledBy}`)).toBeAttached();
   ```

---

### Wall Component Blocking Content

#### Problem: "Page should have main landmark" accessibility test fails

**Cause:** A "wall" component (consent, onboarding, ToS) is rendering instead of app content.

**Solution:** Update `e2e/global-setup.ts` to bypass the wall:

```typescript
// e2e/global-setup.ts localStorage must include:
localStorage: [
  { name: "mirrorbuddy-onboarding", value: JSON.stringify({...}) },
  { name: "mirrorbuddy-consent", value: JSON.stringify({...}) },
  // Add any new "wall" bypass here
]
```

### Auth Test Selector Failures

#### Problem: Auth tests can't find email input

**Cause:** Login uses `input#username` not `input[type="email"]`

**Solution:** Use correct selector:

```typescript
// Correct
await page.fill("input#username", "user@example.com");

// Wrong - will fail
await page.fill('input[type="email"]', "user@example.com");
```

### CI vs Local Test Classification

Some tests only run locally due to external dependencies:

| Test                             | Reason                  | How to Run Locally                        |
| -------------------------------- | ----------------------- | ----------------------------------------- |
| `voice-api.spec.ts`              | WebSocket proxy         | `npm run dev` + `npm run ws-proxy`        |
| `chat-tools-integration.spec.ts` | Azure OpenAI required   | Set `AZURE_OPENAI_*` env vars             |
| `visual-regression.spec.ts`      | Human baseline approval | `VISUAL_REGRESSION=1 npx playwright test` |

Tests use `test.skip(!!process.env.CI, 'reason')` to auto-skip in CI.

---

## Security & Encryption Issues

> See [ADR 0060](docs/adr/0080-security-audit-hardening.md) and [ADR 0063](docs/adr/0063-supabase-ssl-certificate-requirements.md).

### Supabase SSL Certificate

#### Problem: "Unable to verify first certificate" in production

**Cause:** Supabase pooler uses a certificate not in Node.js trust store.

**Solution:**

1. **Get the certificate:**
   - Supabase Dashboard → Database Settings → SSL
   - Or extract via `openssl s_client -connect your-project.pooler.supabase.com:6543`

2. **Set environment variable:**

   ```bash
   # In Vercel
   vercel env add SUPABASE_CA_CERT production --sensitive
   # Paste certificate content when prompted
   ```

3. **Verify:**
   ```bash
   curl https://your-app.vercel.app/api/health
   # Should return {"status":"ok"}
   ```

**Development:** Falls back to `rejectUnauthorized: false` with warning (not for production).

### Token Encryption Key

#### Problem: "TOKEN_ENCRYPTION_KEY required in production"

**Cause:** v0.8.0 requires encryption key for OAuth tokens (AES-256-GCM).

**Solution:**

```bash
# Generate a 32+ character key
openssl rand -hex 32

# Set in Vercel
vercel env add TOKEN_ENCRYPTION_KEY production --sensitive <<< "your-generated-key"

# Or in .env.local for development
TOKEN_ENCRYPTION_KEY=your-32-plus-character-key-here
```

### Rate Limiting Issues

#### Problem: "Too many requests" on login

**Cause:** Rate limit exceeded (5 requests per 15 minutes for login).

**Solution:**

1. Wait 15 minutes
2. Or clear rate limit in development:
   ```bash
   # If using Upstash Redis
   # Delete the rate limit key from Redis console
   ```

Rate limits by endpoint:

- Login: 5/15min
- Password change: 3/15min
- OAuth: 10/min
- Invite requests: 3/hour

---

## Getting Help

### Before Asking for Help

**Try these steps first:**

1. **Search this troubleshooting guide:**
   - Use `Ctrl+F` / `Cmd+F` to search for error messages
   - Check [Quick Diagnosis](#quick-diagnosis) table

2. **Check existing documentation:**
   - [`README.md`](README.md) - Project overview
   - [`SETUP.md`](SETUP.md) - Installation and setup guide
   - [`CONTRIBUTING.md`](CONTRIBUTING.md) - Development guidelines
   - [`docs/claude/`](docs/claude/) - Feature-specific documentation
   - [`docs/technical/`](docs/technical/) - Technical deep dives

3. **Run verification commands:**

   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```

4. **Check in-app diagnostics:**
   - Settings → AI Provider → Diagnostics
   - Settings → Database → Connection Status

5. **Search existing issues:**
   - [GitHub Issues](https://github.com/FightTheStroke/MirrorBuddy/issues)
   - Someone may have already encountered your problem

---

### Reporting Bugs

Found a bug? Please help us fix it by providing detailed information.

#### Where to Report

**GitHub Issues (Preferred):**

- Open a new issue: https://github.com/FightTheStroke/MirrorBuddy/issues/new
- Choose appropriate template: Bug Report or Feature Request

**Email (Alternative):**

- Contact: **roberdan@fightthestroke.org**
- Subject line: `[MirrorBuddy] Bug: Brief description`

#### What to Include

**Essential Information:**

1. **Environment:**

   ```bash
   # Run this command and include output:
   node -v && npm -v
   # Example output:
   # v18.17.0
   # 9.6.7
   ```

2. **Operating System:**
   - Example: macOS 13.4 / Ubuntu 22.04 / Windows 11

3. **Configuration:**
   - Are you using Azure OpenAI or Ollama?
   - SQLite or PostgreSQL?
   - Any custom configuration?
   - **DO NOT include actual API keys or secrets!**

4. **Steps to Reproduce:**

   ```
   1. Go to '...'
   2. Click on '...'
   3. See error
   ```

5. **Expected Behavior:**
   - What should happen?

6. **Actual Behavior:**
   - What actually happens?

7. **Error Messages:**
   - **Browser console errors:** (Open DevTools with F12)

     ```
     Error: Cannot find module '@prisma/client'
         at require (internal/modules/cjs/loader.js:883:19)
     ```

   - **Server/terminal errors:**
     ```bash
     # Copy error messages from terminal
     npm run dev
     ```

8. **Screenshots (if relevant):**
   - Visual bugs or UI issues
   - ⚠️ **Redact any sensitive information** (API keys, personal data)

#### Example Bug Report

**Good Example:**

```markdown
**Bug:** Voice button doesn't appear in MirrorBuddy chat

**Environment:**

- Node.js: v18.17.0
- OS: macOS 13.4
- Config: Azure OpenAI with Realtime API

**Steps to Reproduce:**

1. Start dev server: `npm run dev`
2. Navigate to http://localhost:3000
3. Open MirrorBuddy chat
4. Look for microphone button

**Expected:** Microphone button should be visible in chat input

**Actual:** No microphone button appears

**Console Errors:**
```

Warning: AZURE_OPENAI_REALTIME_DEPLOYMENT not configured
Voice features disabled

```

**Additional Context:**
I have set AZURE_OPENAI_REALTIME_DEPLOYMENT in .env.local but button still doesn't appear
```

**Bad Example:**

```markdown
Voice doesn't work. Help!
```

---

### Requesting Features

Have an idea? We'd love to hear it!

#### Before Requesting

1. **Check if it already exists:**
   - Search [existing issues](https://github.com/FightTheStroke/MirrorBuddy/issues?q=is%3Aissue+label%3Aenhancement)
   - Check [`README.md`](README.md) features list

2. **Consider the project scope:**
   - MirrorBuddy focuses on **education for students with learning differences**
   - Features should align with accessibility and inclusion goals

#### How to Request

**GitHub Issues (Preferred):**

1. Open a new issue: https://github.com/FightTheStroke/MirrorBuddy/issues/new
2. Use "Feature Request" template
3. Add `enhancement` label

**Email:**

- Contact: **roberdan@fightthestroke.org**
- Subject: `[MirrorBuddy] Feature Request: Brief description`

#### What to Include

1. **Problem Statement:**
   - What problem does this solve?
   - Who benefits from this feature?

2. **Proposed Solution:**
   - How should it work?
   - What should the UI look like?

3. **Use Case:**
   - Real-world scenario where this helps

4. **Accessibility Considerations:**
   - How does this work for users with:
     - Dyslexia, dyscalculia, dysgraphia?
     - Motor challenges (dyspraxia)?
     - Screen readers?
     - Keyboard-only navigation?

5. **Alternatives Considered:**
   - Are there existing features that partially solve this?
   - Any workarounds?

#### Example Feature Request

```markdown
**Feature:** Export study session summaries as PDF

**Problem:**
Students want to share their study progress with parents/teachers, but currently can only view it in-app.

**Proposed Solution:**

- Add "Export PDF" button in session summary page
- PDF should include: session duration, topics covered, quiz results, AI feedback
- Follow same accessible PDF format as existing PDF generator (7 DSA profiles)

**Use Case:**
A dyslexic student completes a study session and wants to show their parent what they learned. They click "Export PDF" and share the PDF via email.

**Accessibility:**

- Use @react-pdf/renderer (already in project)
- Support all 7 DSA profiles (dyslexia, dyscalculia, etc.)
- Include alt text for images
- Proper heading hierarchy

**Alternatives:**

- Screenshot (not accessible)
- Copy/paste text (loses formatting)
```

---

### Getting Support

#### Community Support

**GitHub Discussions:**

- Ask questions: https://github.com/FightTheStroke/MirrorBuddy/discussions
- Share tips and tricks
- Connect with other developers

**GitHub Issues:**

- Report bugs
- Track feature requests
- See what's being worked on

#### Direct Support

**Email:** roberdan@fightthestroke.org

**Response Time:**

- Bug reports: 1-3 business days
- Feature requests: 1 week
- General questions: 3-5 business days

**When emailing, include:**

- Clear subject line: `[MirrorBuddy] Type: Brief description`
- Your environment (Node.js version, OS, config)
- Steps to reproduce (for bugs)
- What you've already tried

---

### Contributing

Want to fix a bug or add a feature yourself? Amazing!

**Start here:**

1. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) - Development guidelines
2. Read [`docs/EXECUTION-CHECKLIST.md`](docs/EXECUTION-CHECKLIST.md) - Required for all PRs
3. Fork the repository
4. Make your changes
5. Submit a Pull Request

**Important:**

- ⚠️ **All PRs MUST follow the [Execution Checklist](docs/EXECUTION-CHECKLIST.md)**
- PRs without completed checklist will be rejected
- Create execution plan BEFORE implementing
- Get plan approval from maintainer

**Quick Start:**

```bash
# Fork and clone
git clone https://github.com/YOUR-USERNAME/MirrorBuddy.git
cd MirrorBuddy

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# Start dev server
npm run dev

# Make changes...

# Verify before committing
npm run lint && npm run typecheck && npm run build
```

---

### Project Information

**Repository:**

- GitHub: https://github.com/FightTheStroke/MirrorBuddy
- License: MIT

**Organization:**

- FightTheStroke: https://fightthestroke.org
- Mission: Supporting children with hemiplegia and learning differences

**Contact:**

- Lead Developer: Roberto D'Antonio
- Email: roberdan@fightthestroke.org

**Acknowledgments:**
This project was born for inclusion. Every contribution helps make education more accessible for students with learning differences.

---

### Frequently Asked Questions

#### "Can I use MirrorBuddy without Azure OpenAI?"

**Yes!** Use Ollama for 100% free, local, text-only mode:

```bash
brew install ollama
ollama serve
ollama pull llama3.2
```

**Limitations:** No voice features (onboarding, ambient audio)

**See:** [SETUP.md](SETUP.md) → "Ollama Setup"

---

#### "How much does Azure OpenAI cost?"

**Development:** ~$5-20/month for testing

**Production:** Depends on usage

- Chat (gpt-4o): ~$0.01 per conversation
- Voice (gpt-realtime-mini): ~$0.03-0.05 per minute
- Voice (gpt-realtime): ~$0.30 per minute

**Cost optimization:**

- Use `gpt-realtime-mini` for tutoring (90% cheaper)
- Use `gpt-realtime` only for MirrorBuddy (emotional support)
- Monitor costs in Settings → AI Provider

**See:** [docs/claude/voice-api.md](docs/claude/voice-api.md) → "Modelli Disponibili"

---

#### "Can I deploy MirrorBuddy for free?"

**Yes!** Here are free options:

1. **Vercel (Recommended):**
   - Free tier: Unlimited hobby projects
   - HTTPS included
   - Easy GitHub integration
   - Add environment variables in dashboard

2. **Netlify:**
   - Free tier available
   - Similar to Vercel

3. **Self-hosted:**
   - Use SQLite database (free)
   - Use Ollama (free)
   - Deploy on your own server

**Costs you might have:**

- Azure OpenAI API usage (if using voice)
- PostgreSQL hosting (if not using SQLite)

**See:** [SETUP.md](SETUP.md) → "Deployment"

---

#### "Is my data private?"

**Yes, with caveats:**

**Local development:**

- Data stored in local database (SQLite)
- API calls go to Azure OpenAI or local Ollama

**Azure OpenAI:**

- Microsoft processes API requests
- No data used for model training
- See: [Azure OpenAI data privacy](https://learn.microsoft.com/en-us/legal/cognitive-services/openai/data-privacy)

**Ollama (100% local):**

- ✅ All data stays on your machine
- ✅ No internet required after model download
- ✅ Complete privacy

**See:** [SETUP.md](SETUP.md) → "Privacy & Data"

---

#### "How do I update MirrorBuddy?"

```bash
# 1. Backup your database (if using SQLite)
cp prisma/dev.db prisma/dev.db.backup

# 2. Pull latest changes
git pull origin main

# 3. Update dependencies
npm install

# 4. Update database schema
npx prisma generate
npx prisma db push

# 5. Restart dev server
npm run dev
```

**See:** [CONTRIBUTING.md](CONTRIBUTING.md) → "Updating Your Fork"

---

#### "Where can I find more documentation?"

**Start here:**

- [`README.md`](README.md) - Project overview
- [`SETUP.md`](SETUP.md) - Setup guide
- [`CONTRIBUTING.md`](CONTRIBUTING.md) - Development guide
- This file (`TROUBLESHOOTING.md`) - Problem solving

**Feature documentation:**

- [`docs/claude/`](docs/claude/) - Feature-specific docs
  - `voice-api.md` - Voice configuration
  - `ambient-audio.md` - Ambient audio system
  - `learning-path.md` - Learning paths
  - `pdf-generator.md` - PDF export
  - And more...

**Technical deep dives:**

- [`docs/technical/`](docs/technical/)
  - `AZURE_REALTIME_API.md` - Realtime API reference
  - Database schemas, architecture, etc.

**Can't find what you need?**

- Search issues: https://github.com/FightTheStroke/MirrorBuddy/issues
- Ask in discussions: https://github.com/FightTheStroke/MirrorBuddy/discussions
- Email: roberdan@fightthestroke.org

---

**See also:** [SETUP.md](SETUP.md) | [README.md](README.md) | [CONTRIBUTING.md](CONTRIBUTING.md)
