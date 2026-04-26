/**
 * English frustration patterns
 */

import type { LocalePatterns } from './types';

export const englishPatterns: LocalePatterns = {
  locale: 'en',

  frustration: [
    // Explicit frustration
    { pattern: /i\s+can'?t\s+do\s+(this|it)/i, weight: 0.9, category: 'explicit' },
    { pattern: /i('m|\s+am)\s+frustrated/i, weight: 0.95, category: 'explicit' },
    { pattern: /this\s+is\s+(so\s+)?stressful/i, weight: 0.8, category: 'explicit' },
    { pattern: /i\s+hate\s+(this|it|math|school)/i, weight: 0.85, category: 'explicit' },
    { pattern: /i\s+give\s+up/i, weight: 0.95, category: 'explicit' },
    { pattern: /(it'?s|this\s+is)\s+too\s+(hard|difficult)/i, weight: 0.9, category: 'explicit' },
    { pattern: /i\s+can'?t\s+take\s+(it|this)\s+anymore/i, weight: 0.95, category: 'explicit' },
    { pattern: /i('m|\s+am)\s+done/i, weight: 0.7, category: 'explicit' },
    { pattern: /this\s+sucks/i, weight: 0.8, category: 'explicit' },
    { pattern: /it'?s\s+not\s+fair/i, weight: 0.6, category: 'explicit' },
    { pattern: /impossible/i, weight: 0.7, category: 'explicit' },
    { pattern: /forget\s+it/i, weight: 0.75, category: 'explicit' },
    { pattern: /whatever/i, weight: 0.5, category: 'explicit' },

    // Implicit frustration (self-doubt)
    { pattern: /i('m|\s+am)\s+(so\s+)?stupid/i, weight: 0.85, category: 'implicit' },
    { pattern: /i\s+can'?t\s+learn/i, weight: 0.8, category: 'implicit' },
    { pattern: /i('ll|\s+will)\s+never\s+(get|understand)/i, weight: 0.9, category: 'implicit' },
    { pattern: /what'?s\s+the\s+point/i, weight: 0.75, category: 'implicit' },
    { pattern: /it'?s\s+(not|isn'?t)\s+for\s+me/i, weight: 0.8, category: 'implicit' },
    { pattern: /why\s+(can'?t|don'?t)\s+i\s+understand/i, weight: 0.7, category: 'implicit' },
    { pattern: /i('m|\s+am)\s+not\s+smart\s+enough/i, weight: 0.85, category: 'implicit' },
  ],

  repeatRequest: [
    { pattern: /i\s+didn'?t\s+(understand|get\s+it)/i, weight: 0.7, category: 'repeat' },
    { pattern: /(can|could)\s+you\s+repeat/i, weight: 0.6, category: 'repeat' },
    { pattern: /(one\s+more\s+time|again\s+please)/i, weight: 0.5, category: 'repeat' },
    { pattern: /(can|could)\s+you\s+explain\s+(again|that)/i, weight: 0.65, category: 'repeat' },
    { pattern: /i('m|\s+am)\s+not\s+clear/i, weight: 0.6, category: 'repeat' },
    { pattern: /i\s+don'?t\s+(understand|get\s+it)/i, weight: 0.65, category: 'repeat' },
    { pattern: /what\s+do(es)?\s+(that|you)\s+mean/i, weight: 0.4, category: 'repeat' },
    { pattern: /sorry.*didn'?t\s+(hear|catch)/i, weight: 0.4, category: 'repeat' },
    { pattern: /come\s+again/i, weight: 0.5, category: 'repeat' },
    { pattern: /say\s+that\s+again/i, weight: 0.5, category: 'repeat' },
  ],

  confusion: [
    { pattern: /i\s+don'?t\s+know\s+how/i, weight: 0.5, category: 'question' },
    { pattern: /i('m|\s+am)\s+(so\s+)?confused/i, weight: 0.7, category: 'question' },
    { pattern: /i('m|\s+am)\s+lost/i, weight: 0.65, category: 'question' },
    { pattern: /where\s+do\s+i\s+(start|begin)/i, weight: 0.5, category: 'question' },
    { pattern: /what\s+(should|do)\s+i\s+do/i, weight: 0.4, category: 'question' },
    { pattern: /i\s+don'?t\s+know\s+where\s+to/i, weight: 0.6, category: 'question' },
  ],

  fillers: [
    'um', 'uh', 'hmm', 'like', 'you know', 'basically', 'actually',
    'so', 'well', 'i mean', 'kind of', 'sort of', 'whatever',
  ],
};
