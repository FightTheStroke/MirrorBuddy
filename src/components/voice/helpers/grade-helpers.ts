/**
 * Helper functions for automatic grade generation
 */

export function generateFeedback(score: number, _questions: number, _duration: number): string {
  if (score >= 9) {
    return 'Sessione eccezionale! Hai dimostrato grande impegno e curiosita. Continua cosi!';
  } else if (score >= 7) {
    return 'Ottima sessione di studio. Hai fatto buoni progressi e posto domande interessanti.';
  } else if (score >= 5) {
    return 'Buona sessione. C\'e ancora margine di miglioramento, ma stai andando nella direzione giusta.';
  } else {
    return 'La sessione e stata breve. Prova a dedicare piu tempo allo studio per risultati migliori.';
  }
}

export function generateStrengths(questions: number, duration: number): string[] {
  const strengths: string[] = [];

  if (questions >= 5) {
    strengths.push('Curiosita e voglia di approfondire');
  }
  if (duration >= 10) {
    strengths.push('Buona concentrazione durante la sessione');
  }
  if (questions >= 3 && duration >= 5) {
    strengths.push('Interazione attiva con il professore');
  }
  if (strengths.length === 0) {
    strengths.push('Hai iniziato il percorso di apprendimento');
  }

  return strengths;
}

export function generateAreasToImprove(questions: number, duration: number): string[] {
  const areas: string[] = [];

  if (questions < 3) {
    areas.push('Fai piu domande per chiarire i dubbi');
  }
  if (duration < 10) {
    areas.push('Prova sessioni piu lunghe per approfondire meglio');
  }
  if (areas.length === 0) {
    areas.push('Continua a esercitarti regolarmente');
  }

  return areas;
}
