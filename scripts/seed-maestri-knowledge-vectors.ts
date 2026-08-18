/**
 * Seed Maestro Knowledge Vectors
 *
 * Indexes didactic content from the maestri into pgvector for RAG retrieval.
 * Each chunk is tagged with the runtime maestro ID + subject, which is what
 * `maestro-knowledge-retriever.ts` filters on.
 * Uses privacy-aware-embedding.ts for GDPR compliance (C-06).
 *
 * Prerequisite: `npm run kb:extract` writes .tmp/didactic-content.
 *
 * Usage:
 *   npm run kb:seed                    # seed all maestri into the resolved database
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
import {
  deleteEmbeddings,
  storeEmbedding,
  SYSTEM_KB_USER_ID,
} from '../apps/web/src/lib/rag/vector-store';
import {
  chunkDidactic,
  DIDACTIC_DIR,
  loadDidacticContent,
  registeredMaestroIds,
  type DidacticFile,
} from './lib/maestri-kb/corpus';
import {
  assertConnectionMatches,
  ensureSystemUser,
  pruneOrphans,
  resolveTarget,
  SOURCE_TYPE,
  verify,
} from './lib/maestri-kb/target-database';

interface SeedResult {
  maestroId: string;
  chunks: number;
  tokens: number;
}

interface EmbeddedChunk {
  index: number;
  content: string;
  vector: number[];
  tokens: number;
}

/**
 * Embed every chunk before touching the database.
 *
 * The replacement is built in full first because the fragile part of a seed run
 * is the embedding provider — a rate limit or a dropped connection halfway
 * through would otherwise leave a maestro's corpus deleted and only partly
 * rebuilt, and the retriever degrades silently when that happens.
 */
async function embedAll(chunks: string[]): Promise<EmbeddedChunk[]> {
  const embedded: EmbeddedChunk[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generatePrivacyAwareEmbedding(chunks[i]);
    embedded.push({
      index: i,
      content: chunks[i],
      vector: embedding.vector,
      tokens: embedding.usage.tokens,
    });
  }
  return embedded;
}

async function seedMaestro(file: DidacticFile): Promise<SeedResult> {
  const { maestroId, subject } = file;
  const embedded = await embedAll(chunkDidactic(file.content));

  // Idempotency: a re-run replaces this maestro's corpus rather than
  // duplicating it. `@@unique([sourceType, sourceId, chunkIndex])` rules out
  // writing the new rows first, so the swap happens only once every embedding
  // is in hand, keeping the window in which the corpus is incomplete to the
  // local writes below.
  await deleteEmbeddings({
    userId: SYSTEM_KB_USER_ID,
    sourceType: SOURCE_TYPE,
    sourceId: maestroId,
  });

  let tokens = 0;
  for (const chunk of embedded) {
    const row = await storeEmbedding({
      userId: SYSTEM_KB_USER_ID,
      sourceType: SOURCE_TYPE,
      sourceId: maestroId,
      chunkIndex: chunk.index,
      content: chunk.content,
      vector: chunk.vector,
      subject,
      tags: [maestroId, subject],
    });

    // storeEmbedding populates the native pgvector column fire-and-forget, which
    // is right for request latency but wrong for a script: the process would exit
    // before the update lands, leaving vectorNative NULL. The SQL search function
    // filters on `vectorNative IS NOT NULL`, so those rows would be invisible.
    await updateNativeVector(prisma, row.id, chunk.vector);
    tokens += chunk.tokens;
  }

  return { maestroId, chunks: embedded.length, tokens };
}

function listDidacticFiles(only: string | undefined): string[] {
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
  return files;
}

async function prepareDatabase(allowRemote: boolean): Promise<void> {
  const target = resolveTarget(allowRemote);
  await assertConnectionMatches(target);

  if (!isEmbeddingConfigured()) {
    console.error(
      '❌ Embedding service not configured. Set AZURE_OPENAI_ENDPOINT, ' +
        'AZURE_OPENAI_API_KEY and AZURE_OPENAI_EMBEDDING_DEPLOYMENT, or use --dry-run.',
    );
    process.exit(1);
  }

  await ensureSystemUser(SYSTEM_KB_USER_ID);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const allowRemote = process.argv.includes('--yes');
  const only = process.argv.find((a) => a.startsWith('--maestro='))?.split('=')[1];

  const files = listDidacticFiles(only);
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Processing ${files.length} maestri...`);
  console.log(`System user ID: ${SYSTEM_KB_USER_ID}`);

  if (!dryRun) await prepareDatabase(allowRemote);

  let totalChunks = 0;
  let totalTokens = 0;

  for (const file of files) {
    const data = loadDidacticContent(path.join(DIDACTIC_DIR, file));
    if (!data) {
      console.warn(`⚠️  Could not parse: ${file}`);
      continue;
    }

    const label =
      data.slug === data.maestroId ? data.maestroId : `${data.slug} -> ${data.maestroId}`;

    if (dryRun) {
      const chunks = chunkDidactic(data.content).length;
      console.log(`  ${label}: ${chunks} chunks`);
      totalChunks += chunks;
      continue;
    }

    const result = await seedMaestro(data);
    console.log(`  ${label}: ${result.chunks} chunks, ${result.tokens} tokens`);
    totalChunks += result.chunks;
    totalTokens += result.tokens;
  }

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Total: ${totalChunks} chunks, ${totalTokens} tokens`);

  if (dryRun) return;

  await pruneOrphans(SYSTEM_KB_USER_ID, registeredMaestroIds());
  if (!(await verify(SYSTEM_KB_USER_ID))) process.exit(1);
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
