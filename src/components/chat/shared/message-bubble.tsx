/**
 * @file message-bubble.tsx
 * @brief Unified MessageBubble component for all character types
 */

'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Copy, Check, User, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types';
import { AIDisclosureBadge } from '../ai-disclosure-badge';
import { useTranslations } from 'next-intl';

export interface MessageBubbleProps {
  /** The message to display */
  message: ChatMessage;
  /** Character type for role-specific rendering */
  characterType: 'maestro' | 'coach' | 'buddy';
  /** Character avatar URL (required for assistant messages) */
  characterAvatar?: string;
  /** Character color for user message bubbles */
  characterColor?: string;
  /** Character display name for avatar alt text */
  characterName?: string;
  /** Enable TTS button for assistant messages */
  ttsEnabled?: boolean;
  /** TTS speak callback */
  onSpeak?: (text: string) => void;
  /** Copy message callback */
  onCopy?: (content: string, id: string) => void;
  /** ID of currently copied message */
  copiedId?: string | null;
  /** High contrast mode */
  highContrast?: boolean;
  /** Dyslexia-friendly font */
  dyslexiaFont?: boolean;
  /** Line spacing multiplier */
  lineSpacing?: number;
  /** Show AI disclosure badge for assistant messages */
  showAIDisclosure?: boolean;
}

/**
 * Unified message bubble supporting maestros, coaches, and buddies.
 * Provides TTS, voice badge, copy, accessibility, and AI disclosure.
 */
export function MessageBubble({
  message,
  characterType: _characterType,
  characterAvatar,
  characterColor = '#8B4513',
  characterName,
  ttsEnabled = false,
  onSpeak,
  onCopy,
  copiedId,
  highContrast = false,
  dyslexiaFont = false,
  lineSpacing = 1.5,
  showAIDisclosure = false,
}: MessageBubbleProps) {
  const t = useTranslations('chat');
  const isUser = message.role === 'user';
  const isVoice = message.isVoice;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}
    >
      {/* Avatar for assistant */}
      {!isUser && characterAvatar && (
        <div
          className="w-7 h-7 xs:w-8 xs:h-8 rounded-full overflow-hidden flex-shrink-0"
          style={{ boxShadow: `0 0 0 2px ${characterColor}` }}
        >
          <Image
            src={characterAvatar}
            alt={characterName || 'Assistant'}
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Message bubble */}
      <div
        className={cn(
          'max-w-[70%] xs:max-w-[85%] rounded-2xl px-4 py-3 relative group',
          isUser
            ? highContrast
              ? 'bg-yellow-400 text-black'
              : 'bg-accent-themed text-white'
            : highContrast
              ? 'bg-gray-900 text-white border border-gray-700'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white',
          dyslexiaFont && 'tracking-wide',
        )}
        style={{
          lineHeight: lineSpacing,
          ...(isUser && !highContrast ? { backgroundColor: characterColor } : {}),
        }}
      >
        {/* Voice badge */}
        {isVoice && (
          <span className="text-xs opacity-60 mb-1 flex items-center gap-1">
            <Volume2 className="w-3 h-3" /> {t('trascrizioneVocale')}
          </span>
        )}

        {/* Message content */}
        <p className="whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.content}</p>

        {/* Timestamp and TTS controls */}
        <div className="flex items-center justify-between mt-1 gap-2">
          <span className="text-xs opacity-60">
            {new Date(message.timestamp).toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {!isUser && ttsEnabled && onSpeak && (
            <button
              onClick={() => onSpeak(message.content)}
              className="text-xs opacity-60 hover:opacity-100 ml-auto"
              title={t('leggiAdAltaVoce')}
            >
              <Volume2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* AI Disclosure Badge for assistant messages */}
        {!isUser && showAIDisclosure && (
          <div className="mt-2">
            <AIDisclosureBadge variant="compact" />
          </div>
        )}

        {/* Copy button */}
        {onCopy && (
          <button
            onClick={() => onCopy(message.content, message.id)}
            className={cn(
              'absolute -right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-full transition-opacity',
              highContrast ? 'bg-yellow-400 text-black' : 'bg-white dark:bg-slate-700 shadow-md',
            )}
            title={t('copiaMessaggio')}
          >
            {copiedId === message.id ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      {/* Avatar for user */}
      {isUser && (
        <div
          className={cn(
            'w-7 h-7 xs:w-8 xs:h-8 rounded-full flex items-center justify-center flex-shrink-0',
            highContrast ? 'bg-yellow-400 text-black' : 'bg-accent-themed text-white',
          )}
          style={!highContrast ? { backgroundColor: characterColor } : {}}
        >
          <User className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
        </div>
      )}
    </motion.div>
  );
}
