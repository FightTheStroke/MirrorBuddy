/**
 * Italian frustration patterns
 * Handles both accented and non-accented variants
 */

import type { LocalePatterns } from './types';

export const italianPatterns: LocalePatterns = {
  locale: 'it',

  frustration: [
    // Explicit frustration
    { pattern: /non\s+ce\s+la\s+faccio/i, weight: 0.9, category: 'explicit' },
    { pattern: /sono\s+frustrat[oa]/i, weight: 0.95, category: 'explicit' },
    { pattern: /mi\s+stresso/i, weight: 0.8, category: 'explicit' },
    { pattern: /odio/i, weight: 0.85, category: 'explicit' },
    { pattern: /non\s+ci\s+riesco/i, weight: 0.85, category: 'explicit' },
    { pattern: /[eè]\s+troppo\s+difficile/i, weight: 0.9, category: 'explicit' },
    { pattern: /non\s+ne\s+posso\s+pi[uù]/i, weight: 0.95, category: 'explicit' },
    { pattern: /mi\s+arrendo/i, weight: 0.9, category: 'explicit' },
    { pattern: /basta/i, weight: 0.7, category: 'explicit' },
    { pattern: /che\s+palle/i, weight: 0.85, category: 'explicit' },
    { pattern: /che\s+schifo/i, weight: 0.8, category: 'explicit' },
    { pattern: /non\s+[eè]\s+giusto/i, weight: 0.6, category: 'explicit' },
    { pattern: /impossibile/i, weight: 0.7, category: 'explicit' },

    // Implicit frustration (self-doubt)
    { pattern: /sono\s+stupid[oa]/i, weight: 0.85, category: 'implicit' },
    { pattern: /non\s+sono\s+capace/i, weight: 0.8, category: 'implicit' },
    { pattern: /non\s+impar[oe]r[oò]\s+mai/i, weight: 0.9, category: 'implicit' },
    { pattern: /[eè]\s+inutile/i, weight: 0.75, category: 'implicit' },
    { pattern: /non\s+fa\s+per\s+me/i, weight: 0.8, category: 'implicit' },
    { pattern: /perch[eé]\s+non\s+capisco/i, weight: 0.7, category: 'implicit' },
  ],

  repeatRequest: [
    { pattern: /non\s+ho\s+capito/i, weight: 0.7, category: 'repeat' },
    { pattern: /ripet[aei]/i, weight: 0.6, category: 'repeat' },
    { pattern: /di\s+nuovo/i, weight: 0.5, category: 'repeat' },
    { pattern: /puoi\s+spiegare\s+ancora/i, weight: 0.65, category: 'repeat' },
    { pattern: /non\s+mi\s+[eè]\s+chiaro/i, weight: 0.6, category: 'repeat' },
    { pattern: /non\s+capisco/i, weight: 0.65, category: 'repeat' },
    { pattern: /cosa\s+significa/i, weight: 0.4, category: 'repeat' },
    { pattern: /puoi\s+rispiegare/i, weight: 0.7, category: 'repeat' },
    { pattern: /come\s+hai\s+detto/i, weight: 0.5, category: 'repeat' },
    { pattern: /scusa.*non.*sentito/i, weight: 0.4, category: 'repeat' },
  ],

  confusion: [
    { pattern: /non\s+so\s+come/i, weight: 0.5, category: 'question' },
    { pattern: /sono\s+confus[oa]/i, weight: 0.7, category: 'question' },
    { pattern: /mi\s+sono\s+pers[oa]/i, weight: 0.65, category: 'question' },
    { pattern: /da\s+dove\s+comincio/i, weight: 0.5, category: 'question' },
    { pattern: /che\s+devo\s+fare/i, weight: 0.4, category: 'question' },
    { pattern: /non\s+so\s+da\s+che\s+parte/i, weight: 0.6, category: 'question' },
  ],

  fillers: [
    'ehm', 'uhm', 'mmm', 'boh', 'mah', 'cioè', 'tipo', 'praticamente',
    'allora', 'dunque', 'ecco', 'insomma', 'vabbe', 'vabbè',
  ],
};
