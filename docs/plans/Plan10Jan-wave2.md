# Wave 2: Database Migration

**Obiettivo**: Migrare a PostgreSQL (Supabase) per abilitare vector search
**Effort**: 2-3 giorni
**Branch**: `feature/wave2-postgres`
**Dipende da**: Wave 1 completata

---

## T2-01: Configura Prisma per PostgreSQL

**File**: `prisma/schema.prisma`, `src/lib/db.ts`
**Priorità**: P1
**Effort**: 2h

**Cambiamenti schema**:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Rimuovi adapter libsql, usa pg nativo
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}
```

**Cambiamenti db.ts**:
```typescript
// Rimuovi libsql adapter
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

**Acceptance Criteria**:
- [ ] Schema usa `postgresql` provider
- [ ] `src/lib/db.ts` senza adapter libsql
- [ ] `npx prisma generate` passa
- [ ] Connessione a Supabase funziona

**Thor Verification**:
```bash
npx prisma validate
npx prisma generate
# Test connessione
npx prisma db pull --force
```

---

## T2-02: Abilita pgvector extension

**File**: `prisma/migrations/enable_pgvector.sql`
**Priorità**: P1
**Effort**: 1h

**SQL Migration**:
```sql
-- Abilita pgvector (Supabase lo supporta nativamente)
CREATE EXTENSION IF NOT EXISTS vector;

-- Modifica ContentEmbedding per usare vector type
ALTER TABLE "ContentEmbedding"
  ALTER COLUMN vector TYPE vector(1536)
  USING vector::vector(1536);

-- Crea indice per similarity search
CREATE INDEX IF NOT EXISTS content_embedding_vector_idx
  ON "ContentEmbedding"
  USING ivfflat (vector vector_cosine_ops)
  WITH (lists = 100);
```

**Acceptance Criteria**:
- [ ] Extension abilitata su Supabase
- [ ] Colonna vector è tipo `vector(1536)`
- [ ] Indice IVFFlat creato
- [ ] Query similarity funziona

**Thor Verification**:
```sql
-- In Supabase SQL Editor
SELECT * FROM pg_extension WHERE extname = 'vector';
-- Deve restituire 1 riga

-- Test similarity query
SELECT id, 1 - (vector <=> '[0.1, 0.2, ...]') as similarity
FROM "ContentEmbedding"
ORDER BY vector <=> '[0.1, 0.2, ...]'
LIMIT 5;
```

---

## T2-03: Migra dati da SQLite a PostgreSQL

**Script**: `scripts/migrate-sqlite-to-postgres.ts`
**Priorità**: P1
**Effort**: 4h

**Strategia**:
1. Export SQLite a JSON
2. Transform (fix date formats, null handling)
3. Import in PostgreSQL via Prisma

```typescript
// scripts/migrate-sqlite-to-postgres.ts
import { PrismaClient as SqliteClient } from './prisma-sqlite';
import { PrismaClient as PostgresClient } from '@prisma/client';

async function migrate() {
  const sqlite = new SqliteClient();
  const postgres = new PostgresClient();

  // Ordine rispetta foreign keys
  const tables = [
    'User',
    'Maestro',
    'Session',
    'Conversation',
    'Message',
    'Material',
    'Collection',
    'Tag',
    'MaterialTag',
    // ...
  ];

  for (const table of tables) {
    console.log(`Migrating ${table}...`);
    const data = await sqlite[table.toLowerCase()].findMany();

    if (data.length > 0) {
      await postgres[table.toLowerCase()].createMany({
        data,
        skipDuplicates: true,
      });
    }
    console.log(`  ${data.length} records migrated`);
  }
}

migrate().catch(console.error);
```

**Acceptance Criteria**:
- [ ] Tutti i record migrati
- [ ] Foreign keys intatti
- [ ] Date formattate correttamente
- [ ] No data loss

**Thor Verification**:
```bash
# Conta record source
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Material"

# Conta record dest
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Material\""

# Numeri devono matchare
```

---

## T2-04: Rimuovi duplicazione content Message/Material

**File**: `src/lib/tools/tool-persistence.ts`, `src/app/api/chat/route.ts`
**Priorità**: P2
**Effort**: 4h

**Problema**: Content salvato sia in `Message.toolCalls` (JSON) che in `Material.content`

**Soluzione**:
1. `Message.toolCalls` contiene solo metadata (toolId, toolType, status)
2. `Material.content` è single source of truth per contenuto
3. Join quando serve il contenuto completo

```typescript
// Message.toolCalls diventa:
interface ToolCallReference {
  id: string;
  toolId: string;    // FK a Material
  toolType: string;
  status: 'pending' | 'completed' | 'error';
}

// Non più:
interface ToolCallFull {
  id: string;
  toolType: string;
  content: MindmapData | QuizData | ...; // RIMOSSO
}
```

**Acceptance Criteria**:
- [ ] `Message.toolCalls` max 200 bytes per call
- [ ] Content recuperato via join/query separata
- [ ] Nessuna duplicazione in nuovo codice
- [ ] Backward compatible con dati esistenti

**Thor Verification**:
```sql
-- Verifica dimensione toolCalls
SELECT id, LENGTH(tool_calls) as size
FROM "Message"
WHERE tool_calls IS NOT NULL
ORDER BY size DESC
LIMIT 10;
-- Deve essere < 1KB per record
```
