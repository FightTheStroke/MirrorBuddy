/**
 * French frustration patterns
 */

import type { LocalePatterns } from './types';

export const frenchPatterns: LocalePatterns = {
  locale: 'fr',

  frustration: [
    // Explicit frustration
    { pattern: /j'?en\s+peux\s+plus/i, weight: 0.9, category: 'explicit' },
    { pattern: /je\s+suis\s+frustré[e]?/i, weight: 0.95, category: 'explicit' },
    { pattern: /ça\s+me\s+stresse/i, weight: 0.8, category: 'explicit' },
    { pattern: /je\s+déteste/i, weight: 0.85, category: 'explicit' },
    { pattern: /j'?y\s+arrive\s+pas/i, weight: 0.85, category: 'explicit' },
    { pattern: /c'?est\s+trop\s+(dur|difficile)/i, weight: 0.9, category: 'explicit' },
    { pattern: /j'?abandonne/i, weight: 0.9, category: 'explicit' },
    { pattern: /ça\s+suffit/i, weight: 0.7, category: 'explicit' },
    { pattern: /c'?est\s+nul/i, weight: 0.75, category: 'explicit' },
    { pattern: /c'?est\s+pas\s+juste/i, weight: 0.6, category: 'explicit' },
    { pattern: /impossible/i, weight: 0.7, category: 'explicit' },
    { pattern: /laisse\s+tomber/i, weight: 0.75, category: 'explicit' },

    // Implicit frustration
    { pattern: /je\s+suis\s+(trop\s+)?nul(le)?/i, weight: 0.85, category: 'implicit' },
    { pattern: /je\s+suis\s+pas\s+capable/i, weight: 0.8, category: 'implicit' },
    { pattern: /j'?apprendrai\s+jamais/i, weight: 0.9, category: 'implicit' },
    { pattern: /ça\s+sert\s+à\s+rien/i, weight: 0.75, category: 'implicit' },
    { pattern: /c'?est\s+pas\s+pour\s+moi/i, weight: 0.8, category: 'implicit' },
    { pattern: /pourquoi\s+je\s+comprends\s+pas/i, weight: 0.7, category: 'implicit' },
  ],

  repeatRequest: [
    { pattern: /j'?ai\s+pas\s+compris/i, weight: 0.7, category: 'repeat' },
    { pattern: /tu\s+peux\s+répéter/i, weight: 0.6, category: 'repeat' },
    { pattern: /encore\s+une\s+fois/i, weight: 0.5, category: 'repeat' },
    { pattern: /tu\s+peux\s+(ré)?expliquer/i, weight: 0.65, category: 'repeat' },
    { pattern: /c'?est\s+pas\s+clair/i, weight: 0.6, category: 'repeat' },
    { pattern: /je\s+(ne\s+)?comprends\s+pas/i, weight: 0.65, category: 'repeat' },
    { pattern: /ça\s+veut\s+dire\s+quoi/i, weight: 0.4, category: 'repeat' },
    { pattern: /pardon.*pas\s+entendu/i, weight: 0.4, category: 'repeat' },
  ],

  confusion: [
    { pattern: /je\s+sais\s+pas\s+comment/i, weight: 0.5, category: 'question' },
    { pattern: /je\s+suis\s+perdu[e]?/i, weight: 0.7, category: 'question' },
    { pattern: /par\s+où\s+je\s+commence/i, weight: 0.5, category: 'question' },
    { pattern: /qu'?est-ce\s+que\s+je\s+(dois|fais)/i, weight: 0.4, category: 'question' },
  ],

  fillers: [
    'euh', 'heu', 'ben', 'bah', 'genre', 'en fait', 'du coup',
    'voilà', 'quoi', 'tu vois', 'donc', 'enfin',
  ],
};
