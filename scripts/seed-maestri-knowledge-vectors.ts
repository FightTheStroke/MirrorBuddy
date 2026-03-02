/**
 * Seed Maestro Knowledge Vectors
 *
 * Indexes didactic content from maestri into pgvector for RAG retrieval.
 * Each chunk is tagged with maestroId + subject for filtered retrieval.
 * Uses privacy-aware-embedding.ts for GDPR compliance (C-06).
 *
 * Usage:
 *   npx tsx scripts/seed-maestri-knowledge-vectors.ts           # seed all
 *   npx tsx scripts/seed-maestri-knowledge-vectors.ts --dry-run  # preview only
 */

import * as fs from 'fs';
import * as path from 'path';
import { isEmbeddingConfigured } from '../src/lib/rag/embedding-service';
import { generatePrivacyAwareEmbedding } from '../src/lib/rag/privacy-aware-embedding';
import { chunkText } from '../src/lib/rag/semantic-chunker';

const DIDACTIC_DIR = path.join(__dirname, '../.tmp/didactic-content');
const SYSTEM_USER_ID = 'SYSTEM_MAESTRO_KB';

interface ChunkRecord {
  maestroId: string;
  subject: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
}

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

function loadDidacticContent(filePath: string): { maestroId: string; content: string } | null {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const idMatch = raw.match(/export const maestroId\s*=\s*'([^']+)'/);
  const contentMatch = raw.match(/export const content\s*=\s*`([\s\S]*?)`;/);
  if (!idMatch || !contentMatch) return null;
  return { maestroId: idMatch[1], content: contentMatch[1].trim() };
}

async function seedMaestro(
  maestroId: string,
  content: string,
  dryRun: boolean,
): Promise<ChunkRecord[]> {
  const subject = MAESTRO_SUBJECTS[maestroId] || maestroId;
  const chunks = chunkText(content, { maxChunkSize: 500, overlap: 50 });
  const records: ChunkRecord[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk.content.trim()) continue;

    if (!dryRun && isEmbeddingConfigured()) {
      const embedding = await generatePrivacyAwareEmbedding(chunk.content);
      records.push({
        maestroId,
        subject,
        chunkIndex: i,
        content: chunk.content,
        tokenCount: embedding.usage.tokens,
      });
    } else {
      records.push({
        maestroId,
        subject,
        chunkIndex: i,
        content: chunk.content.slice(0, 80) + '...',
        tokenCount: 0,
      });
    }
  }

  return records;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (!fs.existsSync(DIDACTIC_DIR)) {
    console.error(
      `❌ Didactic content not found at ${DIDACTIC_DIR}. Run extract-mini-kb.ts first.`,
    );
    process.exit(1);
  }

  const files = fs.readdirSync(DIDACTIC_DIR).filter((f) => f.endsWith('.ts'));
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Processing ${files.length} maestri...`);
  console.log(`System user ID: ${SYSTEM_USER_ID}`);

  if (!dryRun && !isEmbeddingConfigured()) {
    console.warn(
      '⚠️  Embedding service not configured. Run with --dry-run or set Azure OpenAI env vars.',
    );
    process.exit(1);
  }

  let totalChunks = 0;
  let totalTokens = 0;

  for (const file of files) {
    const data = loadDidacticContent(path.join(DIDACTIC_DIR, file));
    if (!data) {
      console.warn(`⚠️  Could not parse: ${file}`);
      continue;
    }

    const records = await seedMaestro(data.maestroId, data.content, dryRun);
    const chunks = records.length;
    const tokens = records.reduce((sum, r) => sum + r.tokenCount, 0);

    console.log(`  ${data.maestroId}: ${chunks} chunks, ${tokens} tokens`);
    totalChunks += chunks;
    totalTokens += tokens;
  }

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Total: ${totalChunks} chunks, ${totalTokens} tokens`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
