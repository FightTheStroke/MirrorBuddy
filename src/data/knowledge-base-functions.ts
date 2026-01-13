/**
 * Knowledge Base Functions
 * Lazy retrieval, detection, and prompt generation
 */

import type { KnowledgeCategory } from './knowledge-base-types';
import { APP_VERSION } from './knowledge-base-types';
import { FEATURE_INDEX } from './knowledge-base-index';
import { KNOWLEDGE_CONTENT } from './knowledge-base-content';

// ============================================================================
// LAZY RETRIEVAL FUNCTIONS
// ============================================================================

/**
 * Detect relevant categories from a user query.
 * Returns categories sorted by relevance (most matches first).
 */
export function detectCategories(query: string): KnowledgeCategory[] {
  const normalizedQuery = query.toLowerCase();
  const categoryScores = new Map<KnowledgeCategory, number>();

  for (const [keyword, categories] of Object.entries(FEATURE_INDEX)) {
    if (normalizedQuery.includes(keyword)) {
      for (const category of categories) {
        categoryScores.set(category, (categoryScores.get(category) || 0) + 1);
      }
    }
  }

  // Sort by score (descending) and return
  return Array.from(categoryScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);
}

/**
 * Get knowledge content for specific categories.
 * Returns concatenated content for the requested categories.
 */
export function getKnowledgeForCategories(
  categories: KnowledgeCategory[]
): string {
  if (categories.length === 0) return '';

  const uniqueCategories = [...new Set(categories)].slice(0, 3); // Max 3 categories
  return uniqueCategories.map((cat) => KNOWLEDGE_CONTENT[cat]).join('\n\n');
}

/**
 * Get relevant knowledge for a user query.
 * Auto-detects categories and returns only relevant content.
 */
export function getRelevantKnowledge(query: string): string {
  const categories = detectCategories(query);
  if (categories.length === 0) return '';

  return `## INFORMAZIONI RILEVANTI\n\n${getKnowledgeForCategories(categories)}`;
}

// ============================================================================
// COMPACT INDEX PROMPT (Always loaded - ~200 tokens)
// ============================================================================

/**
 * Minimal prompt that tells the coach what topics they can help with.
 * Actual knowledge is loaded on-demand via getRelevantKnowledge().
 */
export function generateCompactIndexPrompt(): string {
  return `## SUPPORTO PIATTAFORMA

Conosci MirrorBuddy v${APP_VERSION.version} e puoi aiutare con:
- 17 Maestri AI e chiamate vocali
- Strumenti (flashcard FSRS, mappe mentali, quiz, demo)
- **Zaino** (/zaino): archivio materiali con ricerca vocale
- **Astuccio** (/astuccio): strumenti creativi
- Coach e Buddy (Triangle of Support)
- **MirrorBucks**: sistema punti stile Fortnite (5 MB/min studio)
- **Stagioni**: 100 livelli per trimestre, reset a ogni stagione
- Achievement e badge sbloccabili
- Dashboard (/dashboard) con statistiche complete
- Pomodoro, calendario e notifiche
- Audio ambientale per concentrazione
- Accessibilita' (dislessia, ADHD, autismo)
- Account e privacy (GDPR)

Se lo studente chiede aiuto su questi argomenti, rispondi con le informazioni corrette.
Per problemi tecnici: verifica permessi browser, HTTPS, ricarica pagina.`;
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * @deprecated Use generateCompactIndexPrompt() + getRelevantKnowledge() instead.
 * Kept for backward compatibility during transition.
 */
export function generateKnowledgeBasePrompt(): string {
  // Return compact version instead of full dump
  return generateCompactIndexPrompt();
}

// ============================================================================
// TECH SUPPORT SUGGESTED PROMPTS
// ============================================================================

export const TECH_SUPPORT_SUGGESTED_PROMPTS = [
  { icon: 'Phone', text: 'Come funzionano le chiamate vocali?', category: 'voice' },
  { icon: 'BookOpen', text: 'Come creo le flashcard?', category: 'flashcards' },
  { icon: 'Calendar', text: 'Come pianifico lo studio?', category: 'scheduler' },
  { icon: 'Accessibility', text: 'Come attivo il font per dislessia?', category: 'accessibility' },
  { icon: 'Bell', text: 'Come imposto le notifiche?', category: 'notifications' },
  { icon: 'Trophy', text: 'Come funzionano XP e livelli?', category: 'gamification' },
  { icon: 'Headphones', text: 'Come uso i suoni per concentrazione?', category: 'ambient_audio' },
];
