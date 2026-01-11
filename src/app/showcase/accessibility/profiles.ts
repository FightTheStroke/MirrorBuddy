/**
 * Accessibility profiles and sample data
 */

import {
  Eye,
  Type,
  Brain,
  Ear,
  Hand,
  Heart,
  Sparkles,
} from 'lucide-react';

export interface AccessibilityProfile {
  id: string;
  name: string;
  icon: typeof Eye;
  color: string;
  description: string;
  settings: Record<string, boolean | number>;
}

export const ACCESSIBILITY_PROFILES: AccessibilityProfile[] = [
  {
    id: 'dyslexia',
    name: 'Dislessia',
    icon: Type,
    color: 'from-blue-500 to-cyan-500',
    description: 'Font OpenDyslexic, spaziatura extra, interlinea aumentata',
    settings: {
      dyslexiaFont: true,
      extraLetterSpacing: true,
      increasedLineHeight: true,
      lineSpacing: 1.5,
      fontSize: 1.1,
    },
  },
  {
    id: 'adhd',
    name: 'ADHD',
    icon: Brain,
    color: 'from-orange-500 to-amber-500',
    description: 'Focus mode, animazioni ridotte, promemoria pause',
    settings: {
      adhdMode: true,
      distractionFreeMode: true,
      breakReminders: true,
      reducedMotion: true,
    },
  },
  {
    id: 'visual',
    name: 'Visivo',
    icon: Eye,
    color: 'from-purple-500 to-violet-500',
    description: 'Alto contrasto, testo grande, sintesi vocale',
    settings: {
      highContrast: true,
      largeText: true,
      fontSize: 1.3,
      ttsEnabled: true,
    },
  },
  {
    id: 'motor',
    name: 'Motorio',
    icon: Hand,
    color: 'from-green-500 to-emerald-500',
    description: 'Navigazione tastiera, nessuna animazione',
    settings: {
      keyboardNavigation: true,
      reducedMotion: true,
    },
  },
  {
    id: 'autism',
    name: 'Autismo',
    icon: Heart,
    color: 'from-pink-500 to-rose-500',
    description: 'UI calma, animazioni ridotte, distraction-free',
    settings: {
      reducedMotion: true,
      distractionFreeMode: true,
      lineSpacing: 1.4,
      fontSize: 1.1,
    },
  },
  {
    id: 'auditory',
    name: 'Uditivo',
    icon: Ear,
    color: 'from-teal-500 to-cyan-500',
    description: 'Comunicazione visiva, nessuna dipendenza audio',
    settings: {
      ttsEnabled: false,
      largeText: true,
      lineSpacing: 1.3,
    },
  },
  {
    id: 'cerebralPalsy',
    name: 'Paralisi Cerebrale',
    icon: Sparkles,
    color: 'from-indigo-500 to-purple-500',
    description: 'Tastiera, TTS, testo grande, spaziatura extra',
    settings: {
      keyboardNavigation: true,
      reducedMotion: true,
      ttsEnabled: true,
      largeText: true,
      fontSize: 1.2,
      lineSpacing: 1.4,
      extraLetterSpacing: true,
    },
  },
];

export const SAMPLE_TEXT = {
  title: 'La Fotosintesi Clorofilliana',
  content: `La fotosintesi e il processo attraverso cui le piante trasformano la luce solare in energia.
Questo processo avviene principalmente nelle foglie, dove si trova la clorofilla,
il pigmento verde che cattura la luce.

Durante la fotosintesi, la pianta assorbe anidride carbonica dall'aria e acqua dal terreno.
Utilizzando l'energia della luce, questi elementi vengono trasformati in glucosio e ossigeno.

Il glucosio serve come nutrimento per la pianta, mentre l'ossigeno viene rilasciato nell'atmosfera,
permettendo a noi e agli altri esseri viventi di respirare.`,
  quiz: 'Quale pigmento e responsabile del colore verde delle piante?',
  options: ['Clorofilla', 'Melanina', 'Carotene', 'Antocianina'],
};
