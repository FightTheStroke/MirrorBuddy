/**
 * Message bubble component
 */

'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Message } from '../types';
import { TypingIndicator } from './typing-indicator';

interface MessageBubbleProps {
  message: Message;
  characterColor: string;
}

export function MessageBubble({ message, characterColor }: MessageBubbleProps) {
  const isAssistant = message.role === 'assistant';

  if (message.isTyping) {
    return (
      <div className="flex justify-start">
        <div
          className="rounded-2xl rounded-bl-md max-w-[80%]"
          style={{ backgroundColor: `${characterColor}30` }}
        >
          <TypingIndicator />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('flex', isAssistant ? 'justify-start' : 'justify-end')}
    >
      <div
        className={cn(
          'px-4 py-3 rounded-2xl max-w-[80%]',
          isAssistant
            ? 'rounded-bl-md'
            : 'rounded-br-md bg-purple-500'
        )}
        style={isAssistant ? { backgroundColor: `${characterColor}30` } : {}}
      >
        <p className="text-white text-sm leading-relaxed">{message.content}</p>
      </div>
    </motion.div>
  );
}
