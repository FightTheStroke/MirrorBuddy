import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { MessageBubble, CharacterAvatar } from './index';
import type { ActiveCharacter, FlowMessage } from '@/lib/stores/conversation-flow-store';

interface ChatLayoutProps {
  messages: FlowMessage[];
  activeCharacter: ActiveCharacter | null;
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function ChatLayout({
  messages,
  activeCharacter,
  isLoading,
  messagesEndRef,
}: ChatLayoutProps) {
  return (
    <div
      className="flex-1 overflow-y-auto p-4"
      role="log"
      aria-live="polite"
      aria-label="Messaggi della conversazione"
    >
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          activeCharacter={message.role === 'assistant' ? activeCharacter : null}
        />
      ))}
      {isLoading && activeCharacter && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-3 mb-4"
        >
          <CharacterAvatar character={activeCharacter} size="sm" />
          <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md">
            <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
          </div>
        </motion.div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

