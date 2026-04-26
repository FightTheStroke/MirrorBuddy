'use client';

import { ArrowLeft, Phone, PhoneOff, Users, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ActiveCharacter } from '@/lib/stores/conversation-flow-store';
import { CharacterAvatar } from './character-avatar';
import { CharacterRoleBadge } from './character-role-badge';
import { CHARACTER_DESCRIPTIONS } from './constants';
import { useTranslations } from 'next-intl';

interface ConversationHeaderProps {
  currentCharacter: ActiveCharacter | null;
  onSwitchToCoach: () => void;
  onSwitchToBuddy: () => void;
  onGoBack: () => void;
  canGoBack: boolean;
  isVoiceActive: boolean;
  onVoiceCall: () => void;
}

/**
 * Enhanced character header with clear identity.
 */
export function ConversationHeader({
  currentCharacter,
  onSwitchToCoach,
  onSwitchToBuddy,
  onGoBack,
  canGoBack,
  isVoiceActive,
  onVoiceCall,
}: ConversationHeaderProps) {
  const t = useTranslations('chat');

  if (!currentCharacter) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700"
      style={{ backgroundColor: `${currentCharacter.color}10` }}
    >
      {canGoBack && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onGoBack}
          aria-label={t('conversationHeader.backAriaLabel')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
      )}

      <CharacterAvatar character={currentCharacter} size="md" showStatus isActive />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-base truncate">{currentCharacter.name}</h2>
          <CharacterRoleBadge type={currentCharacter.type} />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {CHARACTER_DESCRIPTIONS[currentCharacter.id] ||
            t('conversationHeader.defaultDescription')}
        </p>
      </div>

      {/* Voice call button - only for coach and buddy */}
      {(currentCharacter.type === 'coach' || currentCharacter.type === 'buddy') && (
        <Button
          variant={isVoiceActive ? 'destructive' : 'outline'}
          size="icon"
          onClick={onVoiceCall}
          aria-label={
            isVoiceActive
              ? t('conversationHeader.endCallAriaLabel')
              : t('conversationHeader.startCallAriaLabel')
          }
          className={cn('relative', isVoiceActive && 'animate-pulse')}
        >
          {isVoiceActive ? <PhoneOff className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
        </Button>
      )}

      {/* Quick switch buttons */}
      <div className="flex gap-1 ml-2 border-l border-slate-200 dark:border-slate-700 pl-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onSwitchToCoach}
          aria-label={t('conversationHeader.switchToCoachAriaLabel')}
          disabled={currentCharacter.type === 'coach'}
          className={cn(currentCharacter.type === 'coach' && 'opacity-50')}
        >
          <Users className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onSwitchToBuddy}
          aria-label={t('conversationHeader.switchToBuddyAriaLabel')}
          disabled={currentCharacter.type === 'buddy'}
          className={cn(currentCharacter.type === 'buddy' && 'opacity-50')}
        >
          <MessageCircle className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
