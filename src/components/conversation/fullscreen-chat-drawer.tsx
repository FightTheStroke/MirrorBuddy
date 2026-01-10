'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlowMessage } from '@/lib/stores/conversation-flow-store';

interface ChatDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  messages: FlowMessage[];
  maestroColor: string;
}

export function ChatDrawer({
  isOpen,
  onToggle,
  messages,
  maestroColor,
}: ChatDrawerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        className={cn(
          'fixed left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-t-lg',
          'bg-white dark:bg-slate-900 shadow-lg border border-b-0 border-slate-200 dark:border-slate-700',
          'flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300',
          'hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors'
        )}
        style={{ bottom: isOpen ? '320px' : '60px' }}
        onClick={onToggle}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        {isOpen ? (
          <>
            <ChevronDown className="w-4 h-4" />
            Nascondi chat
          </>
        ) : (
          <>
            <ChevronUp className="w-4 h-4" />
            Mostra chat
          </>
        )}
      </motion.button>

      {/* Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-[60px] left-0 right-0 z-30 h-[260px] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shadow-2xl"
          >
            {/* Messages Area */}
            <div className="h-full overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-8">
                  Inizia una conversazione col Professore...
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                      msg.role === 'user'
                        ? 'ml-auto bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                        : 'mr-auto text-white'
                    )}
                    style={msg.role === 'assistant' ? { backgroundColor: maestroColor } : undefined}
                  >
                    {msg.content}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
