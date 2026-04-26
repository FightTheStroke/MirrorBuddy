/**
 * @file shared.ts
 * @brief Shared helper functions for all buddies
 */

import type { LearningDifference } from '@/types';

/**
 * Maps learning differences to Italian descriptions for the buddy's background.
 */
export const LEARNING_DIFFERENCE_DESCRIPTIONS: Record<
  LearningDifference,
  string
> = {
  dyslexia: 'dislessia (le lettere a volte si confondono, la lettura richiede più tempo)',
  dyscalculia: 'discalculia (i numeri sono un casino, la matematica è una lotta)',
  dysgraphia: 'disgrafia (scrivere a mano è faticoso, preferisco il computer)',
  adhd: 'ADHD (concentrarsi è difficile, la mente vaga sempre)',
  autism: 'autismo (il mondo sensoriale è intenso, le regole sociali sono complicate)',
  cerebralPalsy: 'paralisi cerebrale (il corpo non sempre fa quello che voglio)',
  visualImpairment: 'problemi di vista (devo avvicinare molto lo schermo)',
  auditoryProcessing:
    'difficoltà di elaborazione uditiva (capire quello che sento richiede sforzo)',
};

/**
 * Generates the learning differences section for the buddy's prompt.
 */
export function describeLearningDifferences(
  differences: LearningDifference[]
): string {
  if (differences.length === 0) {
    return 'Non ho diagnosi particolari, ma so che studiare può essere difficile per tutti.';
  }

  if (differences.length === 1) {
    return `Ho la ${LEARNING_DIFFERENCE_DESCRIPTIONS[differences[0]]}.`;
  }

  const descriptions = differences.map(
    (d) => LEARNING_DIFFERENCE_DESCRIPTIONS[d]
  );
  const lastDiff = descriptions.pop();
  return `Ho ${descriptions.join(', ')} e ${lastDiff}.`;
}

/**
 * Generates tips based on learning differences (from personal experience).
 */
export function generatePersonalTips(
  differences: LearningDifference[]
): string {
  const tips: string[] = [];

  if (differences.includes('dyslexia')) {
    tips.push(
      '- Per la lettura: uso gli audiolibri e il text-to-speech. Game changer!'
    );
  }
  if (differences.includes('dyscalculia')) {
    tips.push(
      '- Per la matematica: faccio sempre gli esercizi con carta e penna, passo per passo. E uso le app con le visualizzazioni.'
    );
  }
  if (differences.includes('adhd')) {
    tips.push(
      "- Per la concentrazione: tecnica del pomodoro (25 min studio, 5 pausa). E metto il telefono in un'altra stanza!"
    );
  }
  if (differences.includes('autism')) {
    tips.push(
      '- Per organizzarmi: routine fisse e liste. Sapere cosa aspettarmi mi aiuta tantissimo.'
    );
  }
  if (differences.includes('dysgraphia')) {
    tips.push(
      "- Per scrivere: uso sempre il computer o detto al telefono. La mia grafia è illeggibile, ma chissenefrega!"
    );
  }

  if (tips.length === 0) {
    tips.push('- Il mio trucco principale: non mollare mai, anche quando sembra impossibile.');
  }

  return tips.join('\n');
}

