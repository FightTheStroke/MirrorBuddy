/**
 * Seed Maestro Knowledge Vectors
 *
 * Indexes didactic content from maestri into pgvector for RAG retrieval.
 * Each chunk is tagged with maestroId + subject for filtered retrieval.
 * Uses privacy-aware-embedding.ts for GDPR compliance (C-06).
 *
 * Prerequisite: `npm run kb:extract` writes .tmp/didactic-content.
 *
 * Usage:
 *   npm run kb:seed                    # seed all maestri into DATABASE_URL
 *   npm run kb:seed -- --dry-run       # chunk + count, no embeddings, no writes
 *   npm run kb:seed -- --maestro=feynman
 *   npm run kb:seed -- --yes           # required for a non-local database
 *
 * The script must run under the `react-server` export condition, because the
 * RAG layer imports `@/lib/db`, which is marked `server-only`. The npm script
 * already passes it; invoke it that way rather than calling tsx directly.
 */

import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../apps/web/src/lib/db';
import { isEmbeddingConfigured } from '../apps/web/src/lib/rag/embedding-service';
import { updateNativeVector } from '../apps/web/src/lib/rag/pgvector-utils';
import { generatePrivacyAwareEmbedding } from '../apps/web/src/lib/rag/privacy-aware-embedding';
import { chunkText } from '../apps/web/src/lib/rag/semantic-chunker';
import {
  deleteEmbeddings,
  storeEmbedding,
  SYSTEM_KB_USER_ID,
} from '../apps/web/src/lib/rag/vector-store';

const DIDACTIC_DIR = path.join(__dirname, '../.tmp/didactic-content');
const SOURCE_TYPE = 'maestro_knowledge' as const;

const MAESTRO_SUBJECTS: Record<string, string> = {
  'alex-pina': 'spanish',
  'amici-miei': 'italian-culture',
  cassese: 'law',
  cervantes: 'spanish',
  chris: 'presentation',
  cicerone: 'latin',
  curie: 'chemistry',
  darwin: 'biology',
  erodoto: 'history',
  euclide: 'mathematics',
  feynman: 'physics',
  galileo: 'physics',
  goethe: 'german',
  humboldt: 'geography',
  ippocrate: 'health',
  leonardo: 'art',
  'levi-montalcini': 'biology',
  lovelace: 'computer-science',
  manzoni: 'italian-literature',
  moliere: 'french',
  mozart: 'music',
  omero: 'greek-literature',
  shakespeare: 'english',
  simone: 'sports',
  smith: 'economics',
  socrate: 'philosophy',
};

interface SeedResult {
  maestroId: string;
  chunks: number;
  tokens: number;
}

function loadDidacticContent(filePath: string): { maestroId: string; content: string } | null {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const idMatch = raw.match(/export const maestroId\s*=\s*'([^']+)'/);
  const contentMatch = raw.match(/export const content\s*=\s*`([\s\S]*?)`;/);
  if (!idMatch || !contentMatch) return null;
  return { maestroId: idMatch[1], content: contentMatch[1].trim() };
}

/**
 * Refuse to touch a database that is not obviously local unless the caller says
 * so explicitly. `.env` in this repo points at production Supabase, so an
 * unguarded run against the ambient environment would write there.
 */
function assertDatabaseIsIntended(allowRemote: boolean): void {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ DATABASE_URL is not set.');
    process.exit(1);
  }

  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    console.error('❌ DATABASE_URL is not a valid URL.');
    process.exit(1);
  }

  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  console.log(`Target database host: ${host}${isLocal ? ' (local)' : ' (REMOTE)'}`);

  if (!isLocal && !allowRemote) {
    console.error(
      `❌ Refusing to seed remote database "${host}" without --yes.\n` +
        `   Re-run with --yes if you really mean to write there.`,
    );
    process.exit(1);
  }
}

/**
 * `ContentEmbedding.userId` is a foreign key to `User.id`, so the system corpus
 * needs an owner row to exist at all. This is the reason a seed run could never
 * have worked before: every insert failed the constraint.
 *
 * The row is created disabled so it can never be used to authenticate, and it
 * is not a data subject — it owns in-house didactic content, not personal data.
 * Note the FK cascades on delete: removing this row wipes the knowledge base.
 */
async function ensureSystemUser(): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { id: SYSTEM_KB_USER_ID } });
  if (existing) {
    if (!existing.disabled) {
      console.warn(`⚠️  System user ${SYSTEM_KB_USER_ID} exists but is not disabled.`);
    }
    return;
  }

  await prisma.user.create({
    data: {
      id: SYSTEM_KB_USER_ID,
      username: 'system-maestro-kb',
      role: 'USER',
      disabled: true,
    },
  });
  console.log(`Created system owner row ${SYSTEM_KB_USER_ID} (disabled, non-login).`);
}

async function seedMaestro(maestroId: string, content: string): Promise<SeedResult> {
  const subject = MAESTRO_SUBJECTS[maestroId] || maestroId;
  const chunks = chunkText(content, { maxChunkSize: 500, overlap: 50 });

  // Idempotency: a re-run replaces this maestro's corpus rather than duplicating it.
  await deleteEmbeddings({
    userId: SYSTEM_KB_USER_ID,
    sourceType: SOURCE_TYPE,
    sourceId: maestroId,
  });

  let stored = 0;
  let tokens = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk.content.trim()) continue;

    const embedding = await generatePrivacyAwareEmbedding(chunk.content);

    const row = await storeEmbedding({
      userId: SYSTEM_KB_USER_ID,
      sourceType: SOURCE_TYPE,
      sourceId: maestroId,
      chunkIndex: i,
      content: chunk.content,
      vector: embedding.vector,
      subject,
      tags: [maestroId, subject],
    });

    // storeEmbedding populates the native pgvector column fire-and-forget, which
    // is right for request latency but wrong for a script: the process would exit
    // before the update lands, leaving vectorNative NULL. The SQL search function
    // filters on `vectorNative IS NOT NULL`, so those rows would be invisible.
    await updateNativeVector(prisma, row.id, embedding.vector);

    stored++;
    tokens += embedding.usage.tokens;
  }

  return { maestroId, chunks: stored, tokens };
}

function countChunksOnly(content: string): number {
  return chunkText(content, { maxChunkSize: 500, overlap: 50 }).filter((c) => c.content.trim())
    .length;
}

async function verify(): Promise<boolean> {
  // Report the database actually connected to, not the one requested: db.ts
  // rewrites a Supabase URL to local PostgreSQL in development, so the declared
  // DATABASE_URL and the effective connection can differ.
  const conn = await prisma.$queryRaw<Array<{ db: string; host: string | null }>>`
    SELECT current_database()::TEXT AS db, inet_server_addr()::TEXT AS host
  `;
  console.log(`\nEffective connection: db=${conn[0]?.db} host=${conn[0]?.host ?? 'local socket'}`);

  const total = await prisma.contentEmbedding.count({
    where: { userId: SYSTEM_KB_USER_ID, sourceType: SOURCE_TYPE },
  });

  const missingNative = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::BIGINT AS count
    FROM "ContentEmbedding"
    WHERE "userId" = ${SYSTEM_KB_USER_ID}
      AND "sourceType" = ${SOURCE_TYPE}
      AND "vectorNative" IS NULL
  `;
  const nullNative = Number(missingNative[0]?.count ?? 0);

  const maestri = await prisma.contentEmbedding.groupBy({
    by: ['sourceId'],
    where: { userId: SYSTEM_KB_USER_ID, sourceType: SOURCE_TYPE },
  });

  console.log('\nVerification');
  console.log(`  rows:              ${total}`);
  console.log(`  maestri covered:   ${maestri.length}`);
  console.log(`  vectorNative NULL: ${nullNative}`);

  if (total === 0) {
    console.error('❌ Seeding produced no rows — the knowledge base is still empty.');
    return false;
  }
  if (nullNative > 0) {
    console.error(
      `❌ ${nullNative} rows have no native vector; the SQL search function skips those rows.`,
    );
    return false;
  }

  console.log('✅ Knowledge base is populated and searchable.');
  return true;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const allowRemote = process.argv.includes('--yes');
  const only = process.argv.find((a) => a.startsWith('--maestro='))?.split('=')[1];

  if (!fs.existsSync(DIDACTIC_DIR)) {
    console.error(`❌ Didactic content not found at ${DIDACTIC_DIR}. Run: npm run kb:extract`);
    process.exit(1);
  }

  let files = fs.readdirSync(DIDACTIC_DIR).filter((f) => f.endsWith('.ts'));
  if (only) files = files.filter((f) => f === `${only}.ts`);

  if (files.length === 0) {
    console.error(`❌ No didactic content to process${only ? ` for "${only}"` : ''}.`);
    process.exit(1);
  }

  console.log(`${dryRun ? '[DRY RUN] ' : ''}Processing ${files.length} maestri...`);
  console.log(`System user ID: ${SYSTEM_KB_USER_ID}`);

  if (!dryRun) {
    assertDatabaseIsIntended(allowRemote);

    if (!isEmbeddingConfigured()) {
      console.error(
        '❌ Embedding service not configured. Set AZURE_OPENAI_ENDPOINT, ' +
          'AZURE_OPENAI_API_KEY and AZURE_OPENAI_EMBEDDING_DEPLOYMENT, or use --dry-run.',
      );
      process.exit(1);
    }

    await ensureSystemUser();
  }

  let totalChunks = 0;
  let totalTokens = 0;

  for (const file of files) {
    const data = loadDidacticContent(path.join(DIDACTIC_DIR, file));
    if (!data) {
      console.warn(`⚠️  Could not parse: ${file}`);
      continue;
    }

    if (dryRun) {
      const chunks = countChunksOnly(data.content);
      console.log(`  ${data.maestroId}: ${chunks} chunks`);
      totalChunks += chunks;
      continue;
    }

    const result = await seedMaestro(data.maestroId, data.content);
    console.log(`  ${result.maestroId}: ${result.chunks} chunks, ${result.tokens} tokens`);
    totalChunks += result.chunks;
    totalTokens += result.tokens;
  }

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Total: ${totalChunks} chunks, ${totalTokens} tokens`);

  if (dryRun) return;

  const ok = await verify();
  if (!ok) process.exit(1);
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
