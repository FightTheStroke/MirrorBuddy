/**
 * @file messages-list.tsx
 * @brief Messages list component
 */

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CharacterInfo } from '../utils/character-utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}

interface MessagesListProps {
  messages: Message[];
  character: CharacterInfo;
  isLoading: boolean;
}

export function MessagesList({
  messages,
  character,
  isLoading,
}: MessagesListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
      {messages.map((message) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'flex gap-3',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}
        >
          {message.role === 'assistant' && (
            <div className="flex-shrink-0">
              {character.avatar ? (
                <Image
                  src={character.avatar}
                  alt={character.name}
                  width={36}
                  height={36}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                  {character.name.charAt(0)}
                </div>
              )}
            </div>
          )}
          <div
            className={cn(
              'max-w-[75%] rounded-2xl px-4 py-3',
              message.role === 'user'
                ? 'bg-accent-themed text-white rounded-br-md'
                : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-md shadow-sm'
            )}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            <div className="flex items-center gap-2 mt-1">
              {message.isVoice && (
                <Volume2 className="w-3 h-3 opacity-60" />
              )}
              <p className="text-xs opacity-60">
                {message.timestamp.toLocaleTimeString('it-IT', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-3"
        >
          <div className="flex-shrink-0">
            {character.avatar ? (
              <Image
                src={character.avatar}
                alt={character.name}
                width={36}
                height={36}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                {character.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
            <div className="flex gap-1">
              <span
                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

