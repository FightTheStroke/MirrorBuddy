'use client';

import { cn } from '@/lib/utils';
import type { CharacterType } from '@/types';

interface CharacterRoleBadgeProps {
  type: CharacterType;
}

/**
 * Character role badge.
 */
export function CharacterRoleBadge({ type }: CharacterRoleBadgeProps) {
  const roleLabels: Record<CharacterType, { label: string; color: string }> = {
    coach: { label: 'Coach', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
    buddy: { label: 'Amico', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    maestro: { label: 'Professore', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  };

  const { label, color } = roleLabels[type];

  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', color)}>
      {label}
    </span>
  );
}
