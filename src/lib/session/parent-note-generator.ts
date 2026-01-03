// ============================================================================
// PARENT NOTE GENERATOR
// Auto-generates notes for parents after each session
// Part of Session Summary & Unified Archive feature
// ============================================================================

import { chatCompletion, getActiveProvider } from '@/lib/ai/providers';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';
import type { MaestroEvaluation } from './maestro-evaluation';

interface SessionInfo {
  sessionId: string;
  userId: string;
  maestroId: string;
  maestroName: string;
  subject: string;
  duration: number; // minutes
  topics: string[];
  summary: string;
}

export interface ParentNote {
  summary: string;
  highlights: string[];
  concerns: string[] | null;
  suggestions: string[] | null;
}

/**
 * Generate a note for parents about the session
 */
export async function generateParentNote(
  session: SessionInfo,
  evaluation: MaestroEvaluation
): Promise<ParentNote> {
  const provider = getActiveProvider();
  if (!provider) {
    return {
      summary: `${session.maestroName} ha lavorato con il tuo bambino per ${session.duration} minuti.`,
      highlights: evaluation.strengths,
      concerns: null,
      suggestions: null,
    };
  }

  const systemPrompt = `Sei un assistente che scrive brevi note per i genitori sulle sessioni di studio dei loro figli.

Le note devono essere:
- BREVI e CHIARE (max 3 frasi per il riassunto)
- POSITIVE e INCORAGGIANTI (evidenzia i progressi)
- PRATICHE (suggerimenti concreti se necessario)
- RASSICURANTI (i genitori vogliono sapere che va tutto bene)

NON usare un linguaggio troppo tecnico.
NON essere allarmista, anche per le aree di miglioramento.

Rispondi SOLO con JSON valido:
{
  "summary": "<riassunto della sessione per i genitori, 2-3 frasi>",
  "highlights": ["<cosa è andata bene>", "<altra cosa positiva>"],
  "concerns": ["<eventuale area di attenzione, formulata in modo costruttivo>"] o null,
  "suggestions": ["<suggerimento pratico per casa>"] o null
}`;

  const topicsStr = session.topics.length > 0 ? session.topics.join(', ') : session.subject;

  const userPrompt = `Genera una nota per i genitori su questa sessione:

Maestro: ${session.maestroName}
Materia: ${session.subject}
Durata: ${session.duration} minuti
Argomenti: ${topicsStr}

Riassunto sessione:
${session.summary}

Valutazione del maestro:
- Punteggio: ${evaluation.score}/10
- Commento: ${evaluation.feedback}
- Punti di forza: ${evaluation.strengths.join(', ') || 'nessuno specifico'}
- Aree di miglioramento: ${evaluation.areasToImprove.join(', ') || 'nessuna specifica'}`;

  try {
    const result = await chatCompletion(
      [{ role: 'user', content: userPrompt }],
      systemPrompt
    );

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as ParentNote;
      return {
        summary: parsed.summary || session.summary,
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 3) : [],
        concerns: Array.isArray(parsed.concerns) && parsed.concerns.length > 0
          ? parsed.concerns.slice(0, 2)
          : null,
        suggestions: Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0
          ? parsed.suggestions.slice(0, 2)
          : null,
      };
    }
  } catch (error) {
    logger.error('Failed to generate parent note', { error: String(error) });
  }

  // Fallback note
  return {
    summary: `Il tuo bambino ha partecipato a una sessione di ${session.duration} minuti con ${session.maestroName}. Hanno lavorato su: ${topicsStr}.`,
    highlights: evaluation.strengths.length > 0
      ? evaluation.strengths
      : ['Ha partecipato attivamente alla sessione'],
    concerns: null,
    suggestions: null,
  };
}

/**
 * Save parent note to database
 */
export async function saveParentNote(
  session: SessionInfo,
  note: ParentNote
): Promise<string> {
  const parentNote = await prisma.parentNote.create({
    data: {
      userId: session.userId,
      sessionId: session.sessionId,
      maestroId: session.maestroId,
      subject: session.subject,
      duration: session.duration,
      summary: note.summary,
      highlights: JSON.stringify(note.highlights),
      concerns: note.concerns ? JSON.stringify(note.concerns) : null,
      suggestions: note.suggestions ? JSON.stringify(note.suggestions) : null,
    },
  });

  logger.info('Parent note saved', {
    noteId: parentNote.id,
    sessionId: session.sessionId,
  });

  return parentNote.id;
}

/**
 * Get recent parent notes for a user
 */
export async function getRecentParentNotes(
  userId: string,
  limit: number = 10
): Promise<
  Array<{
    id: string;
    sessionId: string;
    maestroId: string;
    subject: string;
    duration: number;
    summary: string;
    highlights: string[];
    concerns: string[] | null;
    suggestions: string[] | null;
    generatedAt: Date;
    viewedAt: Date | null;
  }>
> {
  const notes = await prisma.parentNote.findMany({
    where: { userId },
    orderBy: { generatedAt: 'desc' },
    take: limit,
  });

  return notes.map((note: {
    id: string;
    sessionId: string;
    maestroId: string;
    subject: string;
    duration: number;
    summary: string;
    highlights: string;
    concerns: string | null;
    suggestions: string | null;
    generatedAt: Date;
    viewedAt: Date | null;
  }) => ({
    id: note.id,
    sessionId: note.sessionId,
    maestroId: note.maestroId,
    subject: note.subject,
    duration: note.duration,
    summary: note.summary,
    highlights: JSON.parse(note.highlights) as string[],
    concerns: note.concerns ? (JSON.parse(note.concerns) as string[]) : null,
    suggestions: note.suggestions ? (JSON.parse(note.suggestions) as string[]) : null,
    generatedAt: note.generatedAt,
    viewedAt: note.viewedAt,
  }));
}

/**
 * Mark a parent note as viewed
 */
export async function markParentNoteViewed(noteId: string): Promise<void> {
  await prisma.parentNote.update({
    where: { id: noteId },
    data: { viewedAt: new Date() },
  });
}

/**
 * Get unread parent notes count
 */
export async function getUnreadParentNotesCount(userId: string): Promise<number> {
  return prisma.parentNote.count({
    where: {
      userId,
      viewedAt: null,
    },
  });
}
