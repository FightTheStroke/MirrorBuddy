'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Loader2, MessageCircle } from 'lucide-react';
import { CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MaestroFull } from '@/data/maestri/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  isLoadingHistory: boolean;
  error: string | null;
  maestro: MaestroFull | null;
  maestroId: string;
  maestroName: string;
  studentName: string;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Messages display area for parent-professor chat
 * Shows conversation history and loading states
 */
export function ChatMessages({
  messages,
  isLoading,
  isLoadingHistory,
  error,
  maestro,
  maestroId,
  maestroName,
  studentName,
  messagesEndRef,
}: ChatMessagesProps) {
  return (
    <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
      {isLoadingHistory && (
        <div className="text-center py-8 text-slate-500">
          <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin" />
          <p>Caricamento conversazione...</p>
        </div>
      )}

      {!isLoadingHistory && messages.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Inizia la conversazione con {maestroName}</p>
          <p className="text-sm mt-1">
            Chieda informazioni sui progressi di {studentName}
          </p>
        </div>
      )}

      <AnimatePresence>
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
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src={maestro?.avatar || `/maestri/${maestroId}.png`}
                  alt={maestroName}
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                />
              </div>
            )}
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2',
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p
                className={cn(
                  'text-xs mt-1',
                  message.role === 'user'
                    ? 'text-indigo-200'
                    : 'text-slate-500'
                )}
              >
                {message.createdAt.toLocaleTimeString('it-IT', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {isLoading && (
        <div className="flex gap-3 justify-start">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            <Image
              src={maestro?.avatar || `/maestri/${maestroId}.png`}
              alt={maestroName}
              width={32}
              height={32}
              className="object-cover w-full h-full"
            />
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div ref={messagesEndRef} />
    </CardContent>
  );
}
