// ============================================================================
// CONVERSATION MEMORY UTILITIES
// Fetching, building, and sanitizing conversation context
// ============================================================================

import type { ConversationMemory } from './types';

/**
 * Sanitize text by removing HTML comments completely.
 * Uses a loop-based approach with combined regex to handle nested/overlapping
 * patterns that could bypass single-pass sanitization.
 * Per CodeQL docs: combines patterns in single regex with alternation.
 * Note: This sanitizes TRUSTED internal strings (maestro definitions), not user input.
 * @see https://codeql.github.com/codeql-query-help/javascript/js-incomplete-multi-character-sanitization/
 */
export function sanitizeHtmlComments(text: string): string {
  let result = text;
  let previousResult: string;

  // Loop until no more changes occur (handles nested patterns like <!---->)
  // Uses combined regex with alternation as recommended by CodeQL docs
  // Handles all standard HTML comment variations including --!> (browser quirk)
  do {
    previousResult = result;
    // Remove complete HTML comments (including --!> variant), then orphaned markers
    result = result.replace(/<!--[\s\S]*?(?:--|--!)>|<!--|(?:--|--!)>/g, '');
  } while (result !== previousResult);

  return result;
}

/**
 * Fetch conversation memory for a maestro from the API
 */
export async function fetchConversationMemory(maestroId: string): Promise<ConversationMemory | null> {
  try {
    const response = await fetch(`/api/conversations?maestroId=${maestroId}&limit=1`);
    if (!response.ok) return null;

    const conversations = await response.json();
    if (!conversations || conversations.length === 0) return null;

    const conv = conversations[0];
    return {
      summary: conv.summary,
      keyFacts: conv.keyFacts
        ? (typeof conv.keyFacts === 'string' ? JSON.parse(conv.keyFacts) : conv.keyFacts)
        : undefined,
      recentTopics: conv.topics
        ? (typeof conv.topics === 'string' ? JSON.parse(conv.topics) : conv.topics)
        : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Build context string from conversation memory for system instructions
 */
export function buildMemoryContext(memory: ConversationMemory | null): string {
  if (!memory) return '';

  let context = '\n\n## MEMORIA DELLE CONVERSAZIONI PRECEDENTI\n';
  context += 'Ricordi importanti dalle sessioni precedenti con questo studente:\n\n';

  if (memory.summary) {
    context += `### Riassunto:\n${memory.summary}\n\n`;
  }

  if (memory.keyFacts?.learned?.length) {
    context += `### Concetti capiti:\n`;
    memory.keyFacts.learned.forEach(l => {
      context += `- ${l}\n`;
    });
    context += '\n';
  }

  if (memory.keyFacts?.preferences?.length) {
    context += `### Preferenze:\n`;
    memory.keyFacts.preferences.forEach(p => {
      context += `- ${p}\n`;
    });
    context += '\n';
  }

  if (memory.recentTopics?.length) {
    context += `### Argomenti recenti:\n`;
    memory.recentTopics.forEach(t => {
      context += `- ${t}\n`;
    });
    context += '\n';
  }

  context += `\n**USA QUESTE INFORMAZIONI** per personalizzare la lezione.\n`;
  return context;
}
