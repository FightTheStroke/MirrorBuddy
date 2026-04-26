import {
  Flame,
  Target,
  Brain,
  Heart,
} from 'lucide-react';

export const METRIC_ICONS = {
  engagement: Flame,
  autonomy: Target,
  method: Brain,
  emotional: Heart,
};

export const METRIC_COLORS = {
  engagement: {
    primary: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    border: 'border-orange-200 dark:border-orange-800',
    progress: 'bg-orange-500',
  },
  autonomy: {
    primary: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
    progress: 'bg-blue-500',
  },
  method: {
    primary: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-200 dark:border-purple-800',
    progress: 'bg-purple-500',
  },
  emotional: {
    primary: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    border: 'border-pink-200 dark:border-pink-800',
    progress: 'bg-pink-500',
  },
};

