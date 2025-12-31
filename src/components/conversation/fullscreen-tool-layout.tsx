'use client';

// ============================================================================
// FULLSCREEN TOOL LAYOUT
// Layout container for fullscreen tool building (mindmaps, etc.)
// Part of Phase 4: Fullscreen Layout
// ============================================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Send, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MaestroOverlay, type MaestroStatus } from '@/components/tools/maestro-overlay';
import type { FlowMessage } from '@/lib/stores/conversation-flow-store';

// ============================================================================
// TYPES
// ============================================================================

export interface ActiveTool {
  type: 'mindmap' | 'quiz' | 'flashcard' | 'demo';
  id: string;
  data: unknown;
}

export interface MaestroInfo {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export interface FullscreenToolLayoutProps {
  tool: ActiveTool;
  maestro: MaestroInfo;
  maestroStatus: MaestroStatus;
  messages: FlowMessage[];
  lastMaestroMessage?: string;
  onSendMessage: (message: string) => void;
  onVoiceToggle?: () => void;
  isVoiceActive?: boolean;
  onClose?: () => void;
  children: React.ReactNode; // The tool component (mindmap, quiz, etc.)
  className?: string;
}

// ============================================================================
// CHAT DRAWER COMPONENT
// ============================================================================

interface ChatDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  messages: FlowMessage[];
  maestroColor: string;
}

function ChatDrawer({
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
                  Inizia una conversazione col Maestro...
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

// ============================================================================
// INPUT BAR COMPONENT
// ============================================================================

interface InputBarProps {
  onSendMessage: (message: string) => void;
  onVoiceToggle?: () => void;
  isVoiceActive?: boolean;
  maestroColor: string;
  placeholder?: string;
}

function InputBar({
  onSendMessage,
  onVoiceToggle,
  isVoiceActive,
  maestroColor,
  placeholder = 'Chiedi al Maestro...',
}: InputBarProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  }, [inputValue, onSendMessage]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[25] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-4 py-2">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-3xl mx-auto">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoComplete="off"
        />

        {onVoiceToggle && (
          <Button
            type="button"
            variant={isVoiceActive ? 'default' : 'outline'}
            size="icon"
            onClick={onVoiceToggle}
            className={cn(
              'shrink-0',
              isVoiceActive && 'animate-pulse'
            )}
            style={isVoiceActive ? { backgroundColor: maestroColor } : undefined}
          >
            {isVoiceActive ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
        )}

        <Button
          type="submit"
          size="icon"
          disabled={!inputValue.trim()}
          style={{ backgroundColor: maestroColor }}
          className="shrink-0 text-white hover:opacity-90"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FullscreenToolLayout({
  tool: _tool,
  maestro,
  maestroStatus,
  messages,
  lastMaestroMessage,
  onSendMessage,
  onVoiceToggle,
  isVoiceActive,
  onClose,
  children,
  className,
}: FullscreenToolLayoutProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Keyboard shortcut to toggle chat (Ctrl/Cmd + /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsChatOpen((prev) => !prev);
      }
      // Escape to close chat
      if (e.key === 'Escape' && isChatOpen) {
        setIsChatOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChatOpen]);

  return (
    <div className={cn('fixed inset-0 bg-white dark:bg-slate-950', className)}>
      {/* Tool Content Area - Full screen with bottom padding for input bar */}
      <div
        className="absolute inset-0 z-10 overflow-auto"
        style={{ paddingBottom: '60px' }}
      >
        {children}
      </div>

      {/* Maestro Overlay - Bottom right, draggable */}
      <MaestroOverlay
        maestro={maestro}
        status={maestroStatus}
        lastMessage={lastMaestroMessage}
        onClose={onClose}
        onExpand={() => setIsChatOpen(true)}
        className="z-20"
      />

      {/* Chat Drawer - Slide up panel */}
      <ChatDrawer
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
        messages={messages}
        maestroColor={maestro.color}
      />

      {/* Input Bar - Fixed at bottom */}
      <InputBar
        onSendMessage={onSendMessage}
        onVoiceToggle={onVoiceToggle}
        isVoiceActive={isVoiceActive}
        maestroColor={maestro.color}
      />
    </div>
  );
}
