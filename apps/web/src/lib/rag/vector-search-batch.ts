import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkPgvectorStatus, formatVectorForPg, type NativeSearchResult } from './pgvector-utils';
import { searchSimilar, type SearchOptions, type VectorSearchResult } from './vector-store';

/**
 * One database round trip, with the original SQL function enforcing each
 * corpus's owner, filters, threshold and limit independently.
 */
export async function searchSimilarBatch(
  searches: SearchOptions[],
): Promise<PromiseSettledResult<VectorSearchResult[]>[]> {
  if (!searches?.length) return [];

  const status = await checkPgvectorStatus(prisma);
  if (status.available) {
    try {
      const queries = searches.map(
        (search, index) => Prisma.sql`
          SELECT ${index}::INTEGER AS search_index, matched.*
          FROM search_similar_embeddings(
            ${search.userId}::TEXT,
            ${formatVectorForPg(search.vector)}::vector(1536),
            ${search.limit ?? 10}::INTEGER,
            ${search.minSimilarity ?? 0.5}::FLOAT,
            ${search.sourceType ?? null}::TEXT,
            ${search.subject ?? null}::TEXT,
            ${search.sourceId ?? null}::TEXT
          ) AS matched
        `,
      );
      const rows = await prisma.$queryRaw<(NativeSearchResult & { search_index: number })[]>(
        Prisma.join(queries, ' UNION ALL '),
      );
      const groups: VectorSearchResult[][] = searches.map(() => []);
      for (const row of rows) {
        const group = groups[row.search_index];
        if (!group) throw new Error('Invalid vector search result group');
        group.push({
          id: row.id,
          sourceType: row.source_type,
          sourceId: row.source_id,
          chunkIndex: row.chunk_index,
          content: row.content,
          similarity: row.similarity,
          subject: row.subject,
          tags: JSON.parse(row.tags) as string[],
        });
      }
      return groups.map((value) => ({
        status: 'fulfilled',
        value: value.sort((a, b) => b.similarity - a.similarity),
      }));
    } catch (error) {
      logger.warn('[VectorStore] Native batch search failed, using individual searches', {
        error: String(error),
      });
    }
  }

  // Keep independent failures independent, as with the original retrievers.
  return Promise.allSettled(searches.map((search) => searchSimilar(search)));
}
