/**
 * Embedding Service for RAG Pipeline
 * Uses Azure OpenAI to generate text embeddings for semantic search.
 * @module rag/embedding-service
 */

import { logger } from '@/lib/logger';

/**
 * Result from embedding generation
 */
export interface EmbeddingResult {
  vector: number[];
  model: string;
  index?: number;
  usage: {
    tokens: number;
  };
}

/**
 * Embedding model dimensions
 */
const MODEL_DIMENSIONS: Record<string, number> = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
};

/**
 * Get embedding vector dimensions for a model
 */
export function getEmbeddingDimensions(model: string): number {
  return MODEL_DIMENSIONS[model] ?? 1536;
}

/**
 * Check if embedding service is configured
 */
export function isEmbeddingConfigured(): boolean {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT;

  return !!(endpoint && apiKey && deployment);
}

/**
 * Get Azure embedding configuration
 */
function getEmbeddingConfig() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview';

  if (!endpoint || !apiKey || !deployment) {
    return null;
  }

  return {
    endpoint: endpoint.replace(/\/$/, ''),
    apiKey,
    deployment,
    apiVersion,
  };
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  const config = getEmbeddingConfig();
  if (!config) {
    throw new Error('Embedding service not configured. Set AZURE_OPENAI_EMBEDDING_DEPLOYMENT.');
  }

  const url = `${config.endpoint}/openai/deployments/${config.deployment}/embeddings?api-version=${config.apiVersion}`;

  logger.debug('[Embedding] Generating embedding', {
    textLength: text.length,
    deployment: config.deployment,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': config.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('[Embedding] API error', { status: response.status, error });
    throw new Error(`Azure Embedding error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const embedding = data.data[0];

  return {
    vector: embedding.embedding,
    model: config.deployment,
    usage: {
      tokens: data.usage?.prompt_tokens ?? 0,
    },
  };
}

/**
 * Generate embeddings for multiple texts in a single API call
 * More efficient than calling generateEmbedding multiple times
 */
export async function generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  // Filter out empty texts
  const validTexts = texts.filter((t) => t && t.trim().length > 0);

  if (validTexts.length === 0) {
    return [];
  }

  const config = getEmbeddingConfig();
  if (!config) {
    throw new Error('Embedding service not configured. Set AZURE_OPENAI_EMBEDDING_DEPLOYMENT.');
  }

  const url = `${config.endpoint}/openai/deployments/${config.deployment}/embeddings?api-version=${config.apiVersion}`;

  logger.debug('[Embedding] Generating batch embeddings', {
    count: validTexts.length,
    deployment: config.deployment,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': config.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: validTexts,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('[Embedding] Batch API error', { status: response.status, error });
    throw new Error(`Azure Embedding error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const totalTokens = data.usage?.prompt_tokens ?? 0;
  const tokensPerText = Math.ceil(totalTokens / validTexts.length);

  return data.data.map((item: { embedding: number[]; index: number }) => ({
    vector: item.embedding,
    model: config.deployment,
    index: item.index,
    usage: {
      tokens: tokensPerText,
    },
  }));
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}
