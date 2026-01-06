/**
 * @file conversation-header.tsx
 * @brief Conversation header component
 */

import Image from 'next/image';
import { Mic, MicOff, RotateCcw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Character } from '../types';

interface ConversationHeaderProps {
  character: Character;
  isVoiceMode: boolean;
  onSwitchCharacter?: () => void;
  onToggleVoice: () => void;
  onClearConversation: () => void;
  highContrast: boolean;
}

export function ConversationHeader({
  character,
  isVoiceMode,
  onSwitchCharacter,
  onToggleVoice,
  onClearConversation,
  highContrast,
}: ConversationHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between px-4 py-3 border-b shrink-0',
        highContrast
          ? 'border-yellow-400 bg-black'
          : 'border-slate-200 dark:border-slate-700'
      )}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onSwitchCharacter}
          className={cn(
            'relative group',
            onSwitchCharacter && 'cursor-pointer'
          )}
          disabled={!onSwitchCharacter}
          aria-label={onSwitchCharacter ? 'Cambia personaggio' : undefined}
        >
          <div
            className="w-12 h-12 rounded-full overflow-hidden transition-transform group-hover:scale-105"
            style={{ boxShadow: `0 0 0 3px ${character.color}` }}
          >
            <Image
              src={character.avatar}
              alt={character.name}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </div>
          {onSwitchCharacter && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">
              <ChevronDown className="w-3 h-3" />
            </div>
          )}
        </button>

        <div>
          <h1
            className={cn(
              'font-semibold text-lg',
              highContrast ? 'text-yellow-400' : 'text-slate-900 dark:text-white'
            )}
          >
            {character.name}
          </h1>
          <p
            className={cn(
              'text-xs',
              highContrast ? 'text-gray-400' : 'text-slate-500'
            )}
          >
            {character.role === 'learning_coach'
              ? 'Coach di studio'
              : character.role === 'buddy'
                ? 'Compagno di studio'
                : 'Maestro'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleVoice}
          className={cn(
            isVoiceMode && 'bg-accent-themed text-white hover:opacity-90'
          )}
          aria-label={isVoiceMode ? 'Disattiva voce' : 'Attiva voce'}
        >
          {isVoiceMode ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearConversation}
          aria-label="Nuova conversazione"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}

