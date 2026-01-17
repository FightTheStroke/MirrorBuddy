/**
 * Age Gating Language Guidance
 * Language complexity and age-appropriate prompts
 */

import type { AgeBracket } from './age-gating-types';
import { TOPIC_MATRIX } from './age-gating-matrix';

/**
 * Get language complexity guidance for age
 * Helps AI adapt vocabulary and sentence structure
 */
export function getLanguageGuidance(age: number): string {
  const bracket = getAgeBracketLocal(age);

  switch (bracket) {
    case 'elementary':
      return `
ADATTAMENTO LINGUISTICO (6-10 anni):
- Usa frasi brevi e semplici (max 10-15 parole)
- Evita parole difficili, spiega i termini nuovi
- Usa esempi concreti e visivi
- Tono amichevole e incoraggiante
- Molte ripetizioni per rafforzare concetti
`;
    case 'middle':
      return `
ADATTAMENTO LINGUISTICO (11-13 anni):
- Frasi di media lunghezza
- Introduci gradualmente vocabolario più avanzato
- Usa analogie e metafore semplici
- Tono rispettoso ma non infantile
- Incoraggia il ragionamento critico
`;
    case 'highschool':
      return `
ADATTAMENTO LINGUISTICO (14-19 anni):
- Linguaggio standard, vocabolario completo
- Riferimenti culturali appropriati
- Stimola l'analisi critica
- Rispetta la maturità cognitiva
- Evita tono paternalistico
`;
    case 'adult':
    default:
      return `
ADATTAMENTO LINGUISTICO (adulti):
- Linguaggio professionale e completo
- Nessuna semplificazione necessaria
- Discussione approfondita consentita
`;
  }
}

/**
 * Get topic restrictions summary for an age bracket
 */
function getTopicRestrictionsForBracket(bracket: AgeBracket): string {
  const restrictions: string[] = [];

  for (const [topic, matrix] of Object.entries(TOPIC_MATRIX)) {
    const sensitivity = matrix[bracket];
    if (sensitivity === 'blocked' || sensitivity === 'restricted') {
      restrictions.push(
        `- ${topic.replace(/_/g, ' ')}: ${sensitivity.toUpperCase()}`
      );
    }
  }

  if (restrictions.length === 0) {
    return "Nessuna restrizione speciale per questa fascia d'età.";
  }

  return restrictions.join('\n');
}

/**
 * Get age-appropriate system prompt addendum
 * Combine with character system prompts
 */
export function getAgeGatePrompt(age: number): string {
  const bracket = getAgeBracketLocal(age);
  const languageGuidance = getLanguageGuidance(age);

  return `
# ADATTAMENTO PER ETÀ: ${age} ANNI (${bracket.toUpperCase()})

${languageGuidance}

## ARGOMENTI SENSIBILI PER QUESTA ETÀ
${getTopicRestrictionsForBracket(bracket)}

RICORDA: Adatta SEMPRE il tuo linguaggio e contenuto all'età dello studente.
`;
}

/**
 * Determine age bracket from numeric age (local copy to avoid circular dependency)
 */
function getAgeBracketLocal(age: number): AgeBracket {
  if (age < 6) return 'elementary'; // Treat pre-school as elementary
  if (age <= 10) return 'elementary';
  if (age <= 13) return 'middle';
  if (age <= 19) return 'highschool';
  return 'adult';
}
