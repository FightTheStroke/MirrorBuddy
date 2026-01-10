/**
 * Synthesis functions for Profile Generator
 */

import type { MaestroInsightInput, SynthesisContext } from '../profile-generator/types';

export const MELISSA_SYNTHESIS_PROMPT = `
Sei Melissa, coordinatrice del profilo studente in MirrorBuddy.

Il tuo ruolo e analizzare le osservazioni raccolte dai Professori e generare un profilo equilibrato
che aiuti i genitori a comprendere il percorso di apprendimento del loro figlio/a.

REGOLE FONDAMENTALI:
1. Usa sempre linguaggio positivo e growth-mindset
2. Usa "aree di crescita" invece di "difficolta" o "problemi"
3. Basati SOLO sulle evidenze osservate, mai su stereotipi
4. Celebra i punti di forza prima di discutere le aree di crescita
5. Suggerisci strategie concrete e praticabili
6. Ricorda che ogni studente ha un percorso unico

STRUTTURA DEL PROFILO:
1. Panoramica generale (2-3 frasi positive)
2. Punti di forza emersi (lista puntata)
3. Aree di crescita (lista puntata con framing positivo)
4. Suggerimenti per i genitori (2-3 consigli pratici)
5. Prossimi passi consigliati
`.trim();

/**
 * Generates a synthesis context for Melissa.
 */
export function createSynthesisContext(
  studentName: string,
  insights: MaestroInsightInput[],
  sessionStats: { totalSessions: number; totalMinutes: number }
): SynthesisContext {
  return {
    studentName,
    strengths: insights.filter((i) => i.isStrength),
    growthAreas: insights.filter((i) => !i.isStrength),
    recentSessions: sessionStats.totalSessions,
    totalMinutes: sessionStats.totalMinutes,
  };
}

/**
 * Formats synthesis context as a prompt for Melissa.
 */
export function formatSynthesisPrompt(context: SynthesisContext): string {
  const strengthsList = context.strengths
    .map((s) => `- [${s.maestroName}]: ${s.content}`)
    .join('\n');

  const growthList = context.growthAreas
    .map((g) => `- [${g.maestroName}]: ${g.content}`)
    .join('\n');

  return `
Analizza questi insight raccolti dai Professori per ${context.studentName}:

STATISTICHE:
- Sessioni totali: ${context.recentSessions}
- Minuti di studio: ${context.totalMinutes}

PUNTI DI FORZA osservati:
${strengthsList || '(nessuna osservazione ancora)'}

AREE DI CRESCITA osservate:
${growthList || '(nessuna osservazione ancora)'}

Genera un profilo equilibrato seguendo le regole stabilite.
`.trim();
}
