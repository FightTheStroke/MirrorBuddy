/**
 * Privacy-Aware Embedding Service
 * Part of Ethical Design Hardening (F-04)
 *
 * Wraps the embedding service to anonymize content before
 * generating embeddings, ensuring PII is not embedded in vectors.
 */

import { logger } from '@/lib/logger';
import {
  anonymizeContent,
  containsSensitivePII,
  AnonymizationOptions,
} from '@/lib/privacy';
import {
  generateEmbedding,
  generateEmbeddings,
  EmbeddingResult,
} from './embedding-service';

const log = logger.child({ module: 'privacy-embedding' });

/**
 * Extended embedding result with privacy metadata
 */
export interface PrivacyAwareEmbeddingResult extends EmbeddingResult {
  /** Whether content was anonymized */
  wasAnonymized: boolean;
  /** Types of PII that were removed */
  piiRemoved: string[];
  /** Original content hash (for debugging, not reversible) */
  contentHash?: string;
}

/**
 * Options for privacy-aware embedding
 */
export interface PrivacyEmbeddingOptions {
  /** Force anonymization even if no sensitive PII detected */
  forceAnonymization?: boolean;
  /** Custom anonymization options */
  anonymizationOptions?: Partial<AnonymizationOptions>;
  /** Store content hash for debugging */
  storeContentHash?: boolean;
}

/**
 * Generate embedding with automatic PII anonymization
 *
 * @param text - Text to embed
 * @param options - Privacy options
 * @returns Embedding result with privacy metadata
 */
export async function generatePrivacyAwareEmbedding(
  text: string,
  options: PrivacyEmbeddingOptions = {}
): Promise<PrivacyAwareEmbeddingResult> {
  const {
    forceAnonymization = false,
    anonymizationOptions,
    storeContentHash = false,
  } = options;

  // Check if anonymization is needed
  const shouldAnonymize = forceAnonymization || containsSensitivePII(text);

  let processedText = text;
  let piiRemoved: string[] = [];

  if (shouldAnonymize) {
    const result = anonymizeContent(text, anonymizationOptions);
    processedText = result.content;
    piiRemoved = result.piiTypesFound;

    if (result.totalReplacements > 0) {
      log.debug('Anonymized content before embedding', {
        replacements: result.totalReplacements,
        piiTypes: piiRemoved,
      });
    }
  }

  // Generate embedding with anonymized content
  const embeddingResult = await generateEmbedding(processedText);

  return {
    ...embeddingResult,
    wasAnonymized: shouldAnonymize && piiRemoved.length > 0,
    piiRemoved,
    contentHash: storeContentHash ? hashContent(text) : undefined,
  };
}

/**
 * Generate embeddings for multiple texts with automatic PII anonymization
 *
 * @param texts - Array of texts to embed
 * @param options - Privacy options (applied to all texts)
 * @returns Array of embedding results with privacy metadata
 */
export async function generatePrivacyAwareEmbeddings(
  texts: string[],
  options: PrivacyEmbeddingOptions = {}
): Promise<PrivacyAwareEmbeddingResult[]> {
  const {
    forceAnonymization = false,
    anonymizationOptions,
    storeContentHash = false,
  } = options;

  // Process each text for anonymization
  const processedTexts: string[] = [];
  const privacyMetadata: Array<{
    wasAnonymized: boolean;
    piiRemoved: string[];
    contentHash?: string;
  }> = [];

  for (const text of texts) {
    const shouldAnonymize = forceAnonymization || containsSensitivePII(text);

    if (shouldAnonymize) {
      const result = anonymizeContent(text, anonymizationOptions);
      processedTexts.push(result.content);
      privacyMetadata.push({
        wasAnonymized: result.totalReplacements > 0,
        piiRemoved: result.piiTypesFound,
        contentHash: storeContentHash ? hashContent(text) : undefined,
      });
    } else {
      processedTexts.push(text);
      privacyMetadata.push({
        wasAnonymized: false,
        piiRemoved: [],
        contentHash: storeContentHash ? hashContent(text) : undefined,
      });
    }
  }

  // Generate embeddings in batch
  const embeddings = await generateEmbeddings(processedTexts);

  // Combine results with privacy metadata
  return embeddings.map((embedding, index) => ({
    ...embedding,
    ...privacyMetadata[index],
  }));
}

/**
 * Check if text requires anonymization before embedding
 * Useful for preview/warning before processing
 */
export function requiresAnonymization(text: string): {
  required: boolean;
  reason: string;
  piiTypes: string[];
} {
  if (containsSensitivePII(text)) {
    const result = anonymizeContent(text);
    return {
      required: true,
      reason: 'Content contains sensitive PII combination',
      piiTypes: result.piiTypesFound,
    };
  }

  return {
    required: false,
    reason: 'No sensitive PII detected',
    piiTypes: [],
  };
}

/**
 * Anonymize conversation for RAG indexing
 * Specialized for conversation content structure
 */
export function anonymizeConversationForRAG(
  conversation: {
    role: 'user' | 'assistant';
    content: string;
  }[]
): {
  anonymizedConversation: typeof conversation;
  totalPIIRemoved: number;
} {
  let totalPIIRemoved = 0;

  const anonymizedConversation = conversation.map((message) => {
    // Only anonymize user messages (assistant messages shouldn't contain PII)
    if (message.role === 'user') {
      const result = anonymizeContent(message.content);
      totalPIIRemoved += result.totalReplacements;
      return {
        ...message,
        content: result.content,
      };
    }
    return message;
  });

  return {
    anonymizedConversation,
    totalPIIRemoved,
  };
}

/**
 * Simple content hash for debugging (not for security)
 */
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `h_${Math.abs(hash).toString(16)}`;
}
