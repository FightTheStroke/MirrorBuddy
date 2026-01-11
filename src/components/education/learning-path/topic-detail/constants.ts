/**
 * Constants for Topic Detail
 */

import { BookOpen, MapIcon, Layers, ClipboardCheck } from 'lucide-react';
import type { TopicStepType } from '@/types';

// Step type icons and labels
export const STEP_CONFIG: Record<
  TopicStepType,
  { icon: React.ElementType; label: string; color: string }
> = {
  overview: {
    icon: BookOpen,
    label: 'Panoramica',
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
  },
  mindmap: {
    icon: MapIcon,
    label: 'Mappa Mentale',
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30',
  },
  flashcard: {
    icon: Layers,
    label: 'Flashcard',
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30',
  },
  quiz: {
    icon: ClipboardCheck,
    label: 'Quiz',
    color: 'text-green-500 bg-green-50 dark:bg-green-900/30',
  },
};
