/**
 * Utility functions and constants for Maestro sessions
 */

import type { SessionEvaluation } from '@/types';

// Constants for score calculations
export const SCORE_QUESTIONS_WEIGHT = 0.5; // Points per question (max 2 points)
export const SCORE_DURATION_WEIGHT = 0.1;  // Points per minute (max 2 points)
export const SCORE_XP_WEIGHT = 0.005;      // Points per XP (max 0.5 points)

/**
 * Generates evaluation based on session metrics.
 */
export function generateAutoEvaluation(
  questionsAsked: number,
  sessionDuration: number,
  xpEarned: number
): SessionEvaluation {
  const baseScore = Math.min(10, Math.max(1,
    5 +
    Math.min(2, questionsAsked * SCORE_QUESTIONS_WEIGHT) +
    Math.min(2, sessionDuration * SCORE_DURATION_WEIGHT) +
    Math.min(0.5, xpEarned * SCORE_XP_WEIGHT)
  ));
  const score = Math.round(baseScore);

  let feedback: string;
  if (score >= 9) {
    feedback = 'Sessione eccezionale! Hai dimostrato grande impegno e curiosità. Continua così!';
  } else if (score >= 7) {
    feedback = 'Ottima sessione di studio. Hai fatto buoni progressi e posto domande interessanti.';
  } else if (score >= 5) {
    feedback = 'Buona sessione. C\'è ancora margine di miglioramento, ma stai andando nella direzione giusta.';
  } else {
    feedback = 'La sessione è stata breve. Prova a dedicare più tempo allo studio per risultati migliori.';
  }

  const strengths: string[] = [];
  if (questionsAsked >= 5) strengths.push('Curiosità e voglia di approfondire');
  if (sessionDuration >= 10) strengths.push('Buona concentrazione durante la sessione');
  if (questionsAsked >= 3 && sessionDuration >= 5) strengths.push('Interazione attiva con il professore');
  if (strengths.length === 0) strengths.push('Hai iniziato il percorso di apprendimento');

  const areasToImprove: string[] = [];
  if (questionsAsked < 3) areasToImprove.push('Fai più domande per chiarire i dubbi');
  if (sessionDuration < 10) areasToImprove.push('Prova sessioni più lunghe per approfondire meglio');
  if (areasToImprove.length === 0) areasToImprove.push('Continua a esercitarti regolarmente');

  return {
    score,
    feedback,
    strengths,
    areasToImprove,
    sessionDuration,
    questionsAsked,
    xpEarned,
    savedToDiary: false,
  };
}
