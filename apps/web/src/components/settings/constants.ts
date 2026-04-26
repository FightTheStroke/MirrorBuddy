import type { TeachingStyle } from '@/lib/stores';

// Teaching style options with descriptions
export const TEACHING_STYLES: Array<{
  value: TeachingStyle;
  label: string;
  emoji: string;
  description: string;
  color: string;
}> = [
  {
    value: 'super_encouraging',
    label: 'Super Incoraggiante',
    emoji: '🌟',
    description: 'Sempre positivo, celebra ogni piccolo progresso',
    color: 'from-green-400 to-emerald-500',
  },
  {
    value: 'encouraging',
    label: 'Incoraggiante',
    emoji: '😊',
    description: 'Supportivo e paziente, focus sul positivo',
    color: 'from-teal-400 to-cyan-500',
  },
  {
    value: 'balanced',
    label: 'Bilanciato',
    emoji: '⚖️',
    description: 'Mix equilibrato di lodi e correzioni costruttive',
    color: 'from-blue-400 to-indigo-500',
  },
  {
    value: 'strict',
    label: 'Rigoroso',
    emoji: '📐',
    description: 'Esigente ma giusto, aspettative alte',
    color: 'from-orange-400 to-amber-500',
  },
  {
    value: 'brutal',
    label: 'Brutale',
    emoji: '🔥',
    description: 'Diretto e senza filtri, sfida costante',
    color: 'from-red-500 to-rose-600',
  },
];
