'use client';

import Image from 'next/image';
import {
  Volume2,
  VolumeX,
  Phone,
  RotateCcw,
  X,
  ArrowLeft,
  Users,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

/**
 * Character types supported by the unified header
 */
export type CharacterType = 'maestro' | 'coach' | 'buddy';

/**
 * Minimal character interface for header display
 */
export interface HeaderCharacter {
  id: string;
  name: string;
  type: CharacterType;
  avatar: string;
  color: string;
  specialty: string;
}

/**
 * Voice connection state for header indicators
 */
export interface VoiceState {
  isActive: boolean;
  isConnected: boolean;
  configError: string | null;
}

/**
 * All possible header actions (use only what you need)
 */
export interface HeaderActions {
  onClose: () => void;
  onClearChat: () => void;
  onVoiceCall: () => void;
  onStopTTS: () => void;
  onGoBack?: () => void;
  onSwitchToCoach?: () => void;
  onSwitchToBuddy?: () => void;
  onOpenHistory?: () => void;
}

/**
 * Props for the unified chat header component
 */
export interface UnifiedChatHeaderProps {
  character: HeaderCharacter;
  voiceState: VoiceState;
  ttsEnabled: boolean;
  actions: HeaderActions;
  highContrast?: boolean;
  dyslexiaFont?: boolean;
}

/**
 * Get badge label for character type
 */
function getCharacterBadge(type: CharacterType): string {
  const badges: Record<CharacterType, string> = {
    maestro: 'Professore',
    coach: 'Coach',
    buddy: 'Amico',
  };
  return badges[type];
}

/**
 * UnifiedChatHeader - Configurable header for all character chat contexts
 *
 * Consolidates:
 * - ChatHeader (maestro chat)
 * - ConversationHeader (coach/buddy flow)
 * - CharacterHeader (unified character components)
 *
 * Features:
 * - Character info (avatar, name, specialty, type badge)
 * - Voice indicator (active/offline/error)
 * - Action buttons (close, clear, voice, TTS, back, character switchers)
 * - Accessibility support (high contrast, dyslexia font)
 * - Responsive design
 */
export function UnifiedChatHeader({
  character,
  voiceState,
  ttsEnabled,
  actions,
  highContrast = false,
  dyslexiaFont = false,
}: UnifiedChatHeaderProps) {
  const t = useTranslations('chat');

  const { isActive, isConnected, configError } = voiceState;
  const showCharacterSwitchers = actions.onSwitchToCoach && actions.onSwitchToBuddy;

  return (
    <header
      className={cn(
        'flex items-center justify-between px-4 py-3 border-b',
        highContrast ? 'border-yellow-400 bg-black' : 'border-slate-200 dark:border-slate-700',
      )}
      style={{ backgroundColor: highContrast ? undefined : `${character.color}10` }}
    >
      {/* Left section: Back button (optional) + Character info */}
      <div className="flex items-center gap-3">
        {actions.onGoBack && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={actions.onGoBack}
            aria-label={t('chatHeader.back')}
            className={cn(
              highContrast
                ? 'text-yellow-400 hover:bg-yellow-400/20'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800',
            )}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}

        {/* Character avatar with status ring */}
        <div
          className="w-10 h-10 rounded-full overflow-hidden relative"
          style={{ boxShadow: `0 0 0 2px ${character.color}` }}
        >
          <Image
            src={character.avatar}
            alt={character.name}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
          {/* Status indicator */}
          {isActive && isConnected && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-white rounded-full bg-green-400 animate-pulse" />
          )}
        </div>

        {/* Character name, specialty, and type badge */}
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="chat-title"
              className={cn(
                'font-semibold',
                highContrast ? 'text-yellow-400' : 'text-slate-900 dark:text-white',
                dyslexiaFont && 'tracking-wide',
              )}
            >
              {character.name}
            </h2>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                highContrast
                  ? 'bg-yellow-400/20 text-yellow-400'
                  : 'bg-slate-100 dark:bg-slate-800',
              )}
            >
              {getCharacterBadge(character.type)}
            </span>
          </div>
          <p className={cn('text-xs', highContrast ? 'text-gray-400' : 'text-slate-500')}>
            {isActive && isConnected ? t('chatHeader.inVoiceCall') : character.specialty}
          </p>
        </div>
      </div>

      {/* Right section: Action buttons */}
      <div className="flex items-center gap-2">
        {/* Voice call button - hidden when active */}
        {!isActive && (
          <button
            onClick={actions.onVoiceCall}
            disabled={!!configError}
            className={cn(
              'p-2 rounded-lg transition-colors',
              configError && 'opacity-50 cursor-not-allowed',
              highContrast
                ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                : 'bg-accent-themed text-white hover:brightness-110',
            )}
            title={
              configError
                ? `${t('chatHeader.voiceUnavailable')}: ${configError}`
                : t('chatHeader.startVoiceCall')
            }
            aria-label={
              configError ? t('chatHeader.voiceUnavailable') : t('chatHeader.startVoiceCall')
            }
          >
            <Phone className="w-4 h-4" />
          </button>
        )}

        {/* TTS toggle */}
        <button
          onClick={ttsEnabled ? actions.onStopTTS : undefined}
          disabled={!ttsEnabled}
          className={cn(
            'p-2 rounded-lg transition-colors',
            highContrast
              ? 'bg-yellow-400 text-black hover:bg-yellow-300'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700',
          )}
          title={ttsEnabled ? t('chatHeader.ttsActive') : t('chatHeader.ttsInactive')}
          aria-label={ttsEnabled ? t('chatHeader.ttsActive') : t('chatHeader.ttsInactive')}
        >
          {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Clear chat */}
        <button
          onClick={actions.onClearChat}
          className={cn(
            'p-2 rounded-lg transition-colors',
            highContrast
              ? 'text-yellow-400 hover:bg-yellow-400/20'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800',
          )}
          title={t('chatHeader.newConversation')}
          aria-label={t('chatHeader.newConversation')}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Character switchers (coach/buddy flow) */}
        {showCharacterSwitchers && (
          <div className="flex gap-1 ml-2 border-l border-slate-200 dark:border-slate-700 pl-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={actions.onSwitchToCoach}
              disabled={character.type === 'coach'}
              aria-label={t('chatHeader.switchToCoach')}
              className={cn(character.type === 'coach' && 'opacity-50')}
            >
              <Users className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={actions.onSwitchToBuddy}
              disabled={character.type === 'buddy'}
              aria-label={t('chatHeader.switchToBuddy')}
              className={cn(character.type === 'buddy' && 'opacity-50')}
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Close */}
        <button
          onClick={actions.onClose}
          className={cn(
            'p-2 rounded-lg transition-colors',
            highContrast
              ? 'text-yellow-400 hover:bg-yellow-400/20'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800',
          )}
          title={t('chatHeader.close')}
          aria-label={t('chatHeader.close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
