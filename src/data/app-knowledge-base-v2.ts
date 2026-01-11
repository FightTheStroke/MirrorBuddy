/**
 * MirrorBuddy App Knowledge Base v2 - Barrel Export
 *
 * OPTIMIZED: Lazy retrieval instead of full injection.
 * Base prompt: ~200 tokens (index only)
 * On-demand: ~500 tokens per relevant category
 *
 * IMPORTANT: Update this file with each release when adding new features.
 * Last updated: 2026-01 (v1.1)
 */

// Re-export types
export type { KnowledgeCategory } from './knowledge-base-types';
export { APP_VERSION } from './knowledge-base-types';

// Re-export index
export { FEATURE_INDEX } from './knowledge-base-index';

// Re-export content
export { KNOWLEDGE_CONTENT } from './knowledge-base-content';

// Re-export functions
export {
  detectCategories,
  getKnowledgeForCategories,
  getRelevantKnowledge,
  generateCompactIndexPrompt,
  generateKnowledgeBasePrompt,
  TECH_SUPPORT_SUGGESTED_PROMPTS,
} from './knowledge-base-functions';
