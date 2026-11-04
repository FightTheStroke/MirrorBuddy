import { logger } from '@/lib/logger';
import {
  formatMaestroKnowledge,
  maestroKnowledgeSearchOptions,
} from '@/lib/rag/maestro-knowledge-retriever';
import { searchSimilarBatch } from '@/lib/rag/vector-search-batch';
import type { SearchOptions, VectorSearchResult } from '@/lib/rag/vector-store';

export type RAGLoad = {
  materials: VectorSearchResult[];
  studyKits: VectorSearchResult[];
} | null;

export async function loadBatchedChatRetrieval(
  userId: string | undefined,
  maestroId: string | undefined,
  embedding: number[],
): Promise<{ maestroKnowledge: string; rag: RAGLoad }> {
  try {
    const searches: SearchOptions[] = [];
    if (maestroId) searches.push(maestroKnowledgeSearchOptions(maestroId, embedding));
    if (userId) {
      searches.push(
        { userId, vector: embedding, limit: 3, minSimilarity: 0.6, sourceType: 'material' },
        { userId, vector: embedding, limit: 3, minSimilarity: 0.5, sourceType: 'studykit' },
      );
    }

    const results = await searchSimilarBatch(searches);
    const maestro = maestroId ? results.shift() : undefined;
    const [materials, studyKits] = results;
    if (maestro?.status === 'rejected') {
      logger.warn('Failed to load maestro knowledge', { error: String(maestro.reason) });
    }
    let rag: RAGLoad = null;
    if (userId) {
      if (materials?.status === 'fulfilled' && studyKits?.status === 'fulfilled') {
        rag = { materials: materials.value, studyKits: studyKits.value };
      } else {
        logger.warn('Failed to load RAG context', {
          error: String(
            materials?.status === 'rejected'
              ? materials.reason
              : studyKits?.status === 'rejected'
                ? studyKits.reason
                : 'Missing batched retrieval results',
          ),
        });
      }
    }
    return {
      maestroKnowledge:
        maestroId && maestro?.status === 'fulfilled'
          ? formatMaestroKnowledge(maestroId, maestro.value)
          : '',
      rag,
    };
  } catch (error) {
    logger.warn('Failed to load batched chat context', { error: String(error) });
    return { maestroKnowledge: '', rag: null };
  }
}
