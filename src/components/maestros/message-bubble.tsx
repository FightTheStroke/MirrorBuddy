'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage, Maestro } from '@/types';

interface MessageBubbleProps {
  message: ChatMessage;
  maestro: Maestro;
  ttsEnabled: boolean;
  speak: (text: string) => void;
}

/**
 * Message bubble component matching CharacterChatView style.
 */
export function MessageBubble({
  message,
  maestro,
  ttsEnabled,
  speak,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isVoice = message.isVoice;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="flex-shrink-0">
          <Image
            src={maestro.avatar}
            alt={maestro.name}
            width={36}
            height={36}
            className="rounded-full object-cover"
          />
        </div>
      )}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-3',
          isUser
            ? 'text-white rounded-br-md'
            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-md shadow-sm'
        )}
        style={isUser ? { backgroundColor: maestro.color } : undefined}
      >
        {isVoice && (
          <span className="text-xs opacity-60 mb-1 flex items-center gap-1">
            <Volume2 className="w-3 h-3" /> Trascrizione vocale
          </span>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <div className="flex items-center justify-between mt-1 gap-2">
          <span className="text-xs opacity-60">
            {new Date(message.timestamp).toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {!isUser && ttsEnabled && (
            <button
              onClick={() => speak(message.content)}
              className="text-xs opacity-60 hover:opacity-100 ml-auto"
              title="Leggi ad alta voce"
            >
              <Volume2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
