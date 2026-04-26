"use client";

/**
 * @file messages-list.tsx
 * @brief Messages list component
 */

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageBubble } from './message-bubble';
import type { ConversationMessage, Character } from '../types';
import { useTranslations } from "next-intl";

interface MessagesListProps {
  messages: ConversationMessage[];
  character: Character;
  isLoading: boolean;
  highContrast: boolean;
  dyslexiaFont: boolean;
  lineSpacing: string;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function MessagesList({
  messages,
  character,
  isLoading,
  highContrast,
  dyslexiaFont,
  lineSpacing,
  messagesEndRef,
}: MessagesListProps) {
  const t = useTranslations("education");
  return (
    <main
      className={cn(
        'flex-1 overflow-y-auto p-4 space-y-4',
        highContrast ? 'bg-black' : ''
      )}
    >
      <AnimatePresence mode="popLayout">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <MessageBubble
              message={message}
              character={character}
              highContrast={highContrast}
              dyslexiaFont={dyslexiaFont}
              lineSpacing={lineSpacing}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3"
        >
          <div
            className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
            style={{ boxShadow: `0 0 0 2px ${character.color}` }}
          >
            <Image
              src={character.avatar}
              alt={character.name}
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          </div>
          <div
            className={cn(
              'rounded-2xl px-4 py-3 flex items-center gap-2',
              highContrast
                ? 'bg-gray-900 border border-gray-700'
                : 'bg-slate-100 dark:bg-slate-800'
            )}
          >
            <Loader2
              className={cn(
                'w-4 h-4 animate-spin',
                highContrast ? 'text-yellow-400' : 'text-blue-500'
              )}
            />
            <span
              className={cn(
                'text-sm',
                highContrast ? 'text-gray-400' : 'text-slate-500'
              )}
            >
              {character.name} {t("staPensando")}
            </span>
          </div>
        </motion.div>
      )}

      <div ref={messagesEndRef} />
    </main>
  );
}

