/**
 * German frustration patterns
 */

import type { LocalePatterns } from './types';

export const germanPatterns: LocalePatterns = {
  locale: 'de',

  frustration: [
    // Explicit frustration
    { pattern: /ich\s+kann\s+nicht\s+mehr/i, weight: 0.9, category: 'explicit' },
    { pattern: /ich\s+bin\s+frustriert/i, weight: 0.95, category: 'explicit' },
    { pattern: /das\s+stresst\s+mich/i, weight: 0.8, category: 'explicit' },
    { pattern: /ich\s+hasse/i, weight: 0.85, category: 'explicit' },
    { pattern: /ich\s+schaff(e|'s)?\s+(das|es)\s+nicht/i, weight: 0.85, category: 'explicit' },
    { pattern: /(das\s+)?ist\s+(zu\s+)?schwer/i, weight: 0.9, category: 'explicit' },
    { pattern: /ich\s+geb(e)?\s+auf/i, weight: 0.9, category: 'explicit' },
    { pattern: /es\s+reicht/i, weight: 0.7, category: 'explicit' },
    { pattern: /das\s+ist\s+(echt\s+)?blöd/i, weight: 0.75, category: 'explicit' },
    { pattern: /das\s+ist\s+unfair/i, weight: 0.6, category: 'explicit' },
    { pattern: /unmöglich/i, weight: 0.7, category: 'explicit' },
    { pattern: /vergiss\s+es/i, weight: 0.75, category: 'explicit' },

    // Implicit frustration
    { pattern: /ich\s+bin\s+(so\s+)?dumm/i, weight: 0.85, category: 'implicit' },
    { pattern: /ich\s+kann\s+das\s+nicht/i, weight: 0.8, category: 'implicit' },
    { pattern: /ich\s+lern(e)?\s+das\s+nie/i, weight: 0.9, category: 'implicit' },
    { pattern: /das\s+bringt\s+nichts/i, weight: 0.75, category: 'implicit' },
    { pattern: /das\s+ist\s+nichts\s+für\s+mich/i, weight: 0.8, category: 'implicit' },
    { pattern: /warum\s+versteh(e)?\s+ich\s+(das\s+)?nicht/i, weight: 0.7, category: 'implicit' },
  ],

  repeatRequest: [
    { pattern: /ich\s+hab(e)?\s+(das\s+)?nicht\s+verstanden/i, weight: 0.7, category: 'repeat' },
    { pattern: /kannst\s+du\s+(das\s+)?wiederholen/i, weight: 0.6, category: 'repeat' },
    { pattern: /noch\s+(ein)?mal/i, weight: 0.5, category: 'repeat' },
    { pattern: /kannst\s+du\s+(das\s+)?(noch\s+mal\s+)?erklären/i, weight: 0.65, category: 'repeat' },
    { pattern: /(das\s+)?ist\s+(mir\s+)?nicht\s+klar/i, weight: 0.6, category: 'repeat' },
    { pattern: /ich\s+versteh(e)?\s+(das\s+)?nicht/i, weight: 0.65, category: 'repeat' },
    { pattern: /was\s+(be)?deutet\s+das/i, weight: 0.4, category: 'repeat' },
    { pattern: /entschuldigung.*nicht\s+gehört/i, weight: 0.4, category: 'repeat' },
  ],

  confusion: [
    { pattern: /ich\s+weiß\s+nicht\s+wie/i, weight: 0.5, category: 'question' },
    { pattern: /ich\s+bin\s+verwirrt/i, weight: 0.7, category: 'question' },
    { pattern: /wo\s+fang(e)?\s+ich\s+an/i, weight: 0.5, category: 'question' },
    { pattern: /was\s+(soll|muss)\s+ich\s+(machen|tun)/i, weight: 0.4, category: 'question' },
  ],

  fillers: [
    'äh', 'ähm', 'hm', 'also', 'halt', 'sozusagen', 'irgendwie',
    'na ja', 'weißt du', 'quasi', 'eigentlich', 'ja',
  ],
};
