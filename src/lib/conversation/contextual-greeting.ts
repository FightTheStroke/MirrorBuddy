// ============================================================================
// CONTEXTUAL GREETING GENERATOR
// Generates personalized greetings based on previous conversation summary
// Part of Session Summary & Unified Archive feature
// ============================================================================

import { chatCompletion, getActiveProvider } from '@/lib/ai/providers';
import { logger } from '@/lib/logger';
import { getLastConversationSummary } from './summary-generator';

interface ContextualGreetingParams {
  studentName: string;
  maestroName: string;
  maestroId: string;
  previousSummary: string;
  previousTopics: string[];
  lastSessionDate: Date | null;
}

interface GreetingResult {
  greeting: string;
  hasContext: boolean;
  topics: string[];
}

/**
 * Format time elapsed since last session in Italian
 */
function formatTimeSince(date: Date | null): string {
  if (!date) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffDays === 0) {
    if (diffHours < 1) return "poco fa";
    if (diffHours === 1) return "un'ora fa";
    return `${diffHours} ore fa`;
  }
  if (diffDays === 1) return "ieri";
  if (diffDays < 7) return `${diffDays} giorni fa`;
  if (diffDays < 14) return "la settimana scorsa";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} settimane fa`;
  return "un po' di tempo fa";
}

/**
 * Generate a contextual greeting based on previous conversation
 */
export async function generateContextualGreeting(
  params: ContextualGreetingParams
): Promise<string> {
  const { studentName, maestroName, previousSummary, previousTopics, lastSessionDate } = params;

  const provider = getActiveProvider();
  if (!provider) {
    // Fallback to basic greeting if no AI available
    return `Ciao ${studentName}! È bello rivederti.`;
  }

  const timeSince = formatTimeSince(lastSessionDate);
  const topicsStr = previousTopics.length > 0 ? previousTopics.join(', ') : 'vari argomenti';

  const systemPrompt = `Sei ${maestroName}, un maestro educativo italiano per studenti con difficoltà di apprendimento.
Genera un saluto breve e amichevole (max 2 frasi) che:
1. Saluti lo studente per nome
2. Faccia riferimento alla conversazione precedente
3. Sia incoraggiante e positivo
4. Inviti a continuare o riprendere l'argomento

NON usare formule generiche tipo "Come stai?".
SEMPRE riferisciti a qualcosa di specifico dalla conversazione precedente.
Usa un tono caldo ma rispettoso.`;

  const userPrompt = `Studente: ${studentName}
Ultima sessione: ${timeSince || 'non specificato'}
Argomenti trattati: ${topicsStr}

Riassunto della conversazione precedente:
${previousSummary}

Genera un saluto contestuale:`;

  try {
    const result = await chatCompletion(
      [{ role: 'user', content: userPrompt }],
      systemPrompt
    );

    return result.content.trim();
  } catch (error) {
    logger.error('Failed to generate contextual greeting', { error: String(error) });
    // Fallback
    return `Ciao ${studentName}! Riprendiamo da dove eravamo rimasti?`;
  }
}

/**
 * Get greeting for a new conversation with a character
 * Returns contextual greeting if previous conversation exists, otherwise null
 */
export async function getGreetingForCharacter(
  userId: string,
  characterId: string,
  studentName: string,
  maestroName: string
): Promise<GreetingResult | null> {
  const lastSummary = await getLastConversationSummary(userId, characterId);

  if (!lastSummary || !lastSummary.summary) {
    return null; // No previous conversation, use default greeting
  }

  const greeting = await generateContextualGreeting({
    studentName,
    maestroName,
    maestroId: characterId,
    previousSummary: lastSummary.summary,
    previousTopics: lastSummary.topics,
    lastSessionDate: lastSummary.lastMessageAt,
  });

  return {
    greeting,
    hasContext: true,
    topics: lastSummary.topics,
  };
}

/**
 * Generate a simple goodbye message with summary
 */
export async function generateGoodbyeMessage(
  studentName: string,
  maestroName: string,
  sessionTopics: string[],
  sessionDuration: number // minutes
): Promise<string> {
  const provider = getActiveProvider();
  if (!provider) {
    return `Ottimo lavoro oggi, ${studentName}! A presto!`;
  }

  const topicsStr = sessionTopics.length > 0 ? sessionTopics.join(', ') : 'vari argomenti';

  const systemPrompt = `Sei ${maestroName}, un maestro educativo italiano.
Genera un breve messaggio di saluto a fine sessione (max 2 frasi) che:
1. Complimenti lo studente per il lavoro fatto
2. Riassuma brevemente cosa è stato fatto
3. Incoraggi per la prossima volta

Tono caldo e positivo.`;

  const userPrompt = `Studente: ${studentName}
Durata sessione: ${sessionDuration} minuti
Argomenti: ${topicsStr}

Genera un saluto di fine sessione:`;

  try {
    const result = await chatCompletion(
      [{ role: 'user', content: userPrompt }],
      systemPrompt
    );

    return result.content.trim();
  } catch (error) {
    logger.error('Failed to generate goodbye message', { error: String(error) });
    return `Ottimo lavoro oggi su ${topicsStr}, ${studentName}! A presto!`;
  }
}
