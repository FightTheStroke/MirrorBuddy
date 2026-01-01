'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { ActiveCharacter } from '@/lib/stores/conversation-flow-store';
import { CharacterAvatar } from './character-avatar';

interface HandoffBannerProps {
  suggestion: {
    toCharacter: ActiveCharacter;
    reason: string;
    confidence: number;
  };
  onAccept: () => void;
  onDismiss: () => void;
}

/**
 * Handoff suggestion banner.
 */
export function HandoffBanner({
  suggestion,
  onAccept,
  onDismiss,
}: HandoffBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mx-4 mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-700"
    >
      <div className="flex items-start gap-4">
        <CharacterAvatar character={suggestion.toCharacter} size="md" />
        <div className="flex-1">
          <p className="font-medium text-amber-800 dark:text-amber-200">
            {suggestion.reason}
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
            Vuoi parlare con {suggestion.toCharacter.name}?
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3 justify-end">
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          No grazie
        </Button>
        <Button
          size="sm"
          onClick={onAccept}
          style={{ backgroundColor: suggestion.toCharacter.color }}
        >
          Parla con {suggestion.toCharacter.name}
        </Button>
      </div>
    </motion.div>
  );
}
