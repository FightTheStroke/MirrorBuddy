'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlowMessage, ActiveCharacter } from '@/lib/stores/conversation-flow-store';
import { CharacterAvatar } from './character-avatar';

interface MessageBubbleProps {
  message: FlowMessage;
  activeCharacter: ActiveCharacter | null;
}

/**
 * Message bubble component.
 */
export function MessageBubble({
  message,
  activeCharacter,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-4"
      >
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-sm text-slate-600 dark:text-slate-400">
          <Sparkles className="w-4 h-4" />
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-3 mb-4', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && activeCharacter && (
        <CharacterAvatar character={activeCharacter} size="sm" />
      )}
      <div
        className={cn(
          'max-w-[80%] px-4 py-3 rounded-2xl',
          isUser
            ? 'bg-accent-themed text-white rounded-br-md'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-md'
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <p className="text-xs opacity-60 mt-1">
          {new Date(message.timestamp).toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </motion.div>
  );
}
