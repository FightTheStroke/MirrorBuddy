'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ActiveCharacter } from '@/lib/stores/conversation-flow-store';
import { CharacterAvatar } from './character-avatar';
import { CharacterRoleBadge } from './character-role-badge';

interface CharacterCardProps {
  character: ActiveCharacter;
  isSelected: boolean;
  onClick: () => void;
  description: string;
}

/**
 * Character introduction card.
 * Exported for potential future use in character selection screens.
 */
export function CharacterCard({
  character,
  isSelected,
  onClick,
  description,
}: CharacterCardProps) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center p-4 rounded-2xl border-2 transition-all',
        'hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2',
        isSelected
          ? 'border-accent-themed bg-accent-themed/5 shadow-md'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      )}
      style={{
        borderColor: isSelected ? character.color : undefined,
        boxShadow: isSelected ? `0 4px 14px ${character.color}20` : undefined,
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <CharacterAvatar character={character} size="xl" showStatus isActive={isSelected} />
      <h3 className="mt-3 font-semibold text-lg">{character.name}</h3>
      <CharacterRoleBadge type={character.type} />
      <p className="mt-2 text-sm text-center text-slate-600 dark:text-slate-400 line-clamp-2">
        {description}
      </p>
    </motion.button>
  );
}
