'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { EvaluationCard } from '@/components/chat/evaluation-card';
import { ToolResultDisplay } from '@/components/tools';
import { MessageBubble } from './message-bubble';
import type { ChatMessage, ToolCall, Maestro } from '@/types';

interface MaestroSessionMessagesProps {
  messages: ChatMessage[];
  toolCalls: ToolCall[];
  maestro: Maestro;
  isLoading: boolean;
  ttsEnabled: boolean;
  speak: (text: string) => void;
  voiceSessionId?: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  fullscreenToolId?: string | null;
  onToggleToolFullscreen?: (toolId: string) => void;
}

export function MaestroSessionMessages({
  messages,
  toolCalls,
  maestro,
  isLoading,
  ttsEnabled,
  speak,
  voiceSessionId,
  messagesEndRef,
  fullscreenToolId,
  onToggleToolFullscreen,
}: MaestroSessionMessagesProps) {
  return (
    <div
      className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50 min-w-0"
      role="log"
      aria-live="polite"
      aria-label="Messaggi della conversazione"
    >
      {messages.map((message) => (
        message.type === 'evaluation' && message.evaluation ? (
          <EvaluationCard
            key={message.id}
            evaluation={message.evaluation}
            maestroName={maestro.name}
            maestroColor={maestro.color}
            className="mb-4"
          />
        ) : (
          <MessageBubble
            key={message.id}
            message={message}
            maestro={maestro}
            ttsEnabled={ttsEnabled}
            speak={speak}
          />
        )
      ))}

      {/* Tool results inline - Skip fullscreen tools, they're rendered separately */}
      {toolCalls.map((tool) => {
        if (fullscreenToolId === tool.id) return null;
        return (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4"
          >
            <ToolResultDisplay 
              toolCall={tool} 
              sessionId={voiceSessionId}
              isFullscreen={false}
              onToggleFullscreen={onToggleToolFullscreen ? () => onToggleToolFullscreen(tool.id) : undefined}
            />
          </motion.div>
        );
      })}

      {/* Loading indicator */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-3"
        >
          <div className="flex-shrink-0">
            <Image
              src={maestro.avatar}
              alt={maestro.name}
              width={36}
              height={36}
              className="rounded-full object-cover"
            />
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </motion.div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
