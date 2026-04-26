/**
 * Spanish frustration patterns
 * Handles Latin American and European Spanish variants
 */

import type { LocalePatterns } from './types';

export const spanishPatterns: LocalePatterns = {
  locale: 'es',

  frustration: [
    // Explicit frustration
    { pattern: /no\s+puedo\s+(más|mas)/i, weight: 0.9, category: 'explicit' },
    { pattern: /estoy\s+frustrad[oa]/i, weight: 0.95, category: 'explicit' },
    { pattern: /me\s+estresa/i, weight: 0.8, category: 'explicit' },
    { pattern: /odio\s+(esto|las?\s+matemáticas?)/i, weight: 0.85, category: 'explicit' },
    { pattern: /no\s+lo\s+logro/i, weight: 0.85, category: 'explicit' },
    { pattern: /es\s+(demasiado\s+)?dif[ií]cil/i, weight: 0.9, category: 'explicit' },
    { pattern: /ya\s+no\s+aguanto/i, weight: 0.95, category: 'explicit' },
    { pattern: /me\s+rindo/i, weight: 0.9, category: 'explicit' },
    { pattern: /¡?basta!?/i, weight: 0.7, category: 'explicit' },
    { pattern: /qué\s+asco/i, weight: 0.8, category: 'explicit' },
    { pattern: /no\s+es\s+justo/i, weight: 0.6, category: 'explicit' },
    { pattern: /imposible/i, weight: 0.7, category: 'explicit' },
    { pattern: /olvídalo/i, weight: 0.75, category: 'explicit' },

    // Implicit frustration (self-doubt)
    { pattern: /soy\s+(un[a]?\s+)?tont[oa]/i, weight: 0.85, category: 'implicit' },
    { pattern: /no\s+soy\s+capaz/i, weight: 0.8, category: 'implicit' },
    { pattern: /nunca\s+(lo\s+)?aprenderé/i, weight: 0.9, category: 'implicit' },
    { pattern: /es\s+in[uú]til/i, weight: 0.75, category: 'implicit' },
    { pattern: /no\s+es\s+para\s+m[ií]/i, weight: 0.8, category: 'implicit' },
    { pattern: /por\s+qué\s+no\s+entiendo/i, weight: 0.7, category: 'implicit' },
    { pattern: /no\s+soy\s+lo\s+suficientemente/i, weight: 0.85, category: 'implicit' },
  ],

  repeatRequest: [
    { pattern: /no\s+(lo\s+)?entend[ií]/i, weight: 0.7, category: 'repeat' },
    { pattern: /puedes\s+repetir/i, weight: 0.6, category: 'repeat' },
    { pattern: /otra\s+vez/i, weight: 0.5, category: 'repeat' },
    { pattern: /puedes\s+explicar\s+(otra\s+vez|de\s+nuevo)/i, weight: 0.65, category: 'repeat' },
    { pattern: /no\s+me\s+queda\s+claro/i, weight: 0.6, category: 'repeat' },
    { pattern: /no\s+(lo\s+)?entiendo/i, weight: 0.65, category: 'repeat' },
    { pattern: /qué\s+significa/i, weight: 0.4, category: 'repeat' },
    { pattern: /perdona.*no.*escuché/i, weight: 0.4, category: 'repeat' },
    { pattern: /cómo\s+dijiste/i, weight: 0.5, category: 'repeat' },
  ],

  confusion: [
    { pattern: /no\s+sé\s+cómo/i, weight: 0.5, category: 'question' },
    { pattern: /estoy\s+confundid[oa]/i, weight: 0.7, category: 'question' },
    { pattern: /me\s+(he\s+)?perdid[oa]/i, weight: 0.65, category: 'question' },
    { pattern: /por\s+d[oó]nde\s+empiezo/i, weight: 0.5, category: 'question' },
    { pattern: /qué\s+(debo|tengo\s+que)\s+hacer/i, weight: 0.4, category: 'question' },
  ],

  fillers: [
    'eh', 'este', 'pues', 'bueno', 'o sea', 'es que', 'tipo',
    'como que', 'sabes', 'entonces', 'digamos', 'básicamente',
  ],
};
