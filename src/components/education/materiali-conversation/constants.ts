/**
 * @file constants.ts
 * @brief Constants for materiali conversation
 */

import { Lightbulb, HelpCircle, BookOpen, Sparkles } from 'lucide-react';
import type { Character } from './types';

export const DEFAULT_MELISSA: Character = {
  id: 'melissa',
  name: 'Melissa',
  avatar: '/images/characters/melissa.png',
  color: '#EC4899',
  role: 'learning_coach',
  greeting: 'Ciao! Sono Melissa, la tua coach di studio. Come posso aiutarti oggi?',
  systemPrompt: `Sei Melissa, una giovane learning coach di 27 anni. Sei intelligente, allegra e paziente.
Il tuo compito è guidare lo studente con il metodo maieutico, facendo domande che stimolano il ragionamento.
Non dare mai risposte dirette, ma guida lo studente a trovarle da solo.
Celebra i progressi e incoraggia sempre.
Rispondi SEMPRE in italiano.`,
};

export const QUICK_ACTIONS = [
  {
    id: 'explain',
    icon: Lightbulb,
    label: 'Spiegami',
    prompt: 'Puoi spiegarmi questo concetto in modo semplice?',
  },
  {
    id: 'help',
    icon: HelpCircle,
    label: 'Ho dubbi',
    prompt: 'Ho dei dubbi su questo argomento, puoi aiutarmi?',
  },
  {
    id: 'practice',
    icon: BookOpen,
    label: 'Esercizio',
    prompt: 'Vorrei fare un esercizio per praticare',
  },
  {
    id: 'summary',
    icon: Sparkles,
    label: 'Riassunto',
    prompt: 'Puoi farmi un riassunto di questo?',
  },
];

