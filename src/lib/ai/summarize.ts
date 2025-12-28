// ============================================================================
// LLM SUMMARIZATION & LEARNING EXTRACTION
// Used to compress conversations and extract user insights
// ============================================================================

import { chatCompletion, getActiveProvider } from './providers';
import { logger } from '@/lib/logger';

interface Message {
  role: string;
  content: string;
}

interface KeyFacts {
  decisions: string[];
  preferences: string[];
  learned: string[];
}

interface Learning {
  category: 'preference' | 'strength' | 'weakness' | 'interest' | 'style';
  insight: string;
  confidence: number;
}

/**
 * Generate a summary of conversation messages
 * Used when conversation gets too long to maintain context
 */
export async function generateConversationSummary(
  messages: Message[]
): Promise<string> {
  const provider = getActiveProvider();
  if (!provider) {
    throw new Error('No AI provider available for summarization');
  }

  const systemPrompt = `Sei un assistente che riassume conversazioni educative.
Crea un riassunto conciso che catturi:
- Argomenti principali discussi
- Domande chiave dello studente
- Concetti spiegati
- Eventuali difficoltà emerse

Rispondi in italiano, max 200 parole.
Usa un linguaggio chiaro e diretto.`;

  const userPrompt = `Riassumi questa conversazione:

${messages.map((m) => `${m.role === 'user' ? 'STUDENTE' : 'MAESTRO'}: ${m.content}`).join('\n\n')}`;

  const result = await chatCompletion(
    [{ role: 'user', content: userPrompt }],
    systemPrompt
  );

  return result.content;
}

/**
 * Extract key facts from conversation
 * Identifies decisions, preferences, and what was learned
 */
export async function extractKeyFacts(messages: Message[]): Promise<KeyFacts> {
  const provider = getActiveProvider();
  if (!provider) {
    return { decisions: [], preferences: [], learned: [] };
  }

  const systemPrompt = `Estrai informazioni chiave dalla conversazione educativa in formato JSON.

Rispondi SOLO con JSON valido in questo formato:
{
  "decisions": ["decisioni prese dallo studente - es. 'vuole approfondire le frazioni'"],
  "preferences": ["preferenze di apprendimento espresse - es. 'preferisce esempi visivi'"],
  "learned": ["concetti che lo studente ha capito - es. 'comprende le operazioni base'"]
}

Se non ci sono informazioni per una categoria, usa un array vuoto.
Max 3 elementi per categoria.`;

  const userPrompt = messages
    .map((m) => `${m.role === 'user' ? 'STUDENTE' : 'MAESTRO'}: ${m.content}`)
    .join('\n\n');

  try {
    const result = await chatCompletion(
      [{ role: 'user', content: userPrompt }],
      systemPrompt
    );

    // Parse JSON from response
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    logger.error('Failed to extract key facts', { error: String(error) });
  }

  return { decisions: [], preferences: [], learned: [] };
}

/**
 * Extract conversation topics
 * Returns list of main subjects discussed
 */
export async function extractTopics(messages: Message[]): Promise<string[]> {
  const provider = getActiveProvider();
  if (!provider) {
    return [];
  }

  const systemPrompt = `Identifica gli argomenti principali discussi nella conversazione educativa.

Rispondi SOLO con un array JSON di stringhe, max 5 argomenti.
Esempio: ["Matematica - Frazioni", "Geometria - Perimetro", "Esercizi pratici"]

Usa termini brevi e chiari.`;

  const userPrompt = messages
    .map((m) => `${m.role === 'user' ? 'STUDENTE' : 'MAESTRO'}: ${m.content}`)
    .join('\n\n');

  try {
    const result = await chatCompletion(
      [{ role: 'user', content: userPrompt }],
      systemPrompt
    );

    // Parse JSON array from response
    const arrayMatch = result.content.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }
  } catch (error) {
    logger.error('Failed to extract topics', { error: String(error) });
  }

  return [];
}

/**
 * Extract learnings about the student
 * These are cross-session insights that help personalize future interactions
 */
export async function extractLearnings(
  messages: Message[],
  _maestroId: string,
  _subject?: string
): Promise<Learning[]> {
  const provider = getActiveProvider();
  if (!provider) {
    return [];
  }

  const systemPrompt = `Analizza la conversazione e identifica caratteristiche dello studente.

Categorie disponibili:
- preference: preferenze di apprendimento (es. "Preferisce esempi pratici")
- strength: punti di forza (es. "Buona memoria visiva")
- weakness: difficoltà (es. "Difficoltà con le frazioni")
- interest: interessi espressi (es. "Interessato alla programmazione")
- style: stile di apprendimento (es. "Apprende meglio con esercizi guidati")

Rispondi SOLO con un array JSON:
[
  {"category": "preference", "insight": "descrizione breve", "confidence": 0.7},
  {"category": "weakness", "insight": "descrizione breve", "confidence": 0.6}
]

Regole:
- Max 3 insights
- Solo caratteristiche evidenti dalla conversazione
- Confidence da 0.3 (debole) a 0.9 (molto evidente)
- Se non ci sono insights chiari, rispondi con []`;

  const userPrompt = messages
    .map((m) => `${m.role === 'user' ? 'STUDENTE' : 'MAESTRO'}: ${m.content}`)
    .join('\n\n');

  try {
    const result = await chatCompletion(
      [{ role: 'user', content: userPrompt }],
      systemPrompt
    );

    // Parse JSON array from response
    const arrayMatch = result.content.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      const learnings = JSON.parse(arrayMatch[0]) as Learning[];
      // Validate and filter
      return learnings
        .filter(
          (l) =>
            ['preference', 'strength', 'weakness', 'interest', 'style'].includes(l.category) &&
            l.insight &&
            l.confidence >= 0.3 &&
            l.confidence <= 1
        )
        .slice(0, 3);
    }
  } catch (error) {
    logger.error('Failed to extract learnings', { error: String(error) });
  }

  return [];
}

/**
 * Generate a title for a conversation from its first messages
 */
export async function generateConversationTitle(
  messages: Message[]
): Promise<string> {
  if (messages.length === 0) {
    return 'Nuova conversazione';
  }

  // If there's a user message, use it directly (truncated)
  const firstUserMsg = messages.find((m) => m.role === 'user');
  if (firstUserMsg) {
    const title = firstUserMsg.content.slice(0, 50);
    return title.length < firstUserMsg.content.length ? `${title}...` : title;
  }

  return 'Nuova conversazione';
}
