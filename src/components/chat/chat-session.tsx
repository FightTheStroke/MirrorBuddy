'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Send,
  X,
  Mic,
  Volume2,
  VolumeX,
  Loader2,
  User,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import { logger } from '@/lib/logger';
import { useTTS } from '@/components/accessibility';
import type { Maestro, ChatMessage, ToolCall } from '@/types';
import { ToolResultDisplay } from '@/components/tools';

interface ChatSessionProps {
  maestro: Maestro;
  onClose: () => void;
  onSwitchToVoice?: () => void;
}

export function ChatSession({ maestro, onClose, onSwitchToVoice }: ChatSessionProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { settings } = useAccessibilityStore();
  const { speak, stop: stopTTS, enabled: ttsEnabled } = useTTS();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: settings.reducedMotion ? 'auto' : 'smooth' });
  }, [messages, settings.reducedMotion]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Add greeting message on mount
  useEffect(() => {
    const greetingMessage: ChatMessage = {
      id: 'greeting',
      role: 'assistant',
      content: maestro.greeting,
      timestamp: new Date(),
    };
    setMessages([greetingMessage]);

    if (settings.ttsAutoRead) {
      speak(maestro.greeting);
    }
  }, [maestro.greeting, settings.ttsAutoRead, speak]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          systemPrompt: maestro.systemPrompt,
          maestroId: maestro.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        tokens: data.usage?.total_tokens,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Handle tool calls if any
      if (data.toolCalls) {
        setToolCalls((prev) => [...prev, ...data.toolCalls]);
      }

      // Read response aloud if TTS auto-read is enabled
      if (settings.ttsAutoRead) {
        speak(data.content);
      }
    } catch (error) {
      logger.error('Chat error', { error: String(error) });
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Mi scuso, si è verificato un errore. Riprova.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const copyMessage = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'greeting',
        role: 'assistant',
        content: maestro.greeting,
        timestamp: new Date(),
      },
    ]);
    setToolCalls([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full max-w-3xl h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden',
          settings.highContrast
            ? 'bg-black border-2 border-yellow-400'
            : 'bg-white dark:bg-slate-900'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-title"
      >
        {/* Header */}
        <header
          className={cn(
            'flex items-center justify-between px-4 py-3 border-b',
            settings.highContrast
              ? 'border-yellow-400 bg-black'
              : 'border-slate-200 dark:border-slate-700'
          )}
          style={{ backgroundColor: `${maestro.color}10` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full overflow-hidden"
              style={{ boxShadow: `0 0 0 2px ${maestro.color}` }}
            >
              <Image
                src={maestro.avatar}
                alt={maestro.name}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2
                id="chat-title"
                className={cn(
                  'font-semibold',
                  settings.highContrast ? 'text-yellow-400' : 'text-slate-900 dark:text-white',
                  settings.dyslexiaFont && 'tracking-wide'
                )}
              >
                {maestro.name}
              </h2>
              <p
                className={cn(
                  'text-xs',
                  settings.highContrast ? 'text-gray-400' : 'text-slate-500'
                )}
              >
                {maestro.specialty}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* TTS toggle */}
            <button
              onClick={() => (ttsEnabled ? stopTTS() : null)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                settings.highContrast
                  ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
              title={ttsEnabled ? 'TTS attivo' : 'TTS disattivo'}
            >
              {ttsEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>

            {/* Switch to voice */}
            {onSwitchToVoice && (
              <button
                onClick={onSwitchToVoice}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  settings.highContrast
                    ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                )}
                title="Passa alla modalità voce"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}

            {/* Clear chat */}
            <button
              onClick={clearChat}
              className={cn(
                'p-2 rounded-lg transition-colors',
                settings.highContrast
                  ? 'text-yellow-400 hover:bg-yellow-400/20'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
              title="Nuova conversazione"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className={cn(
                'p-2 rounded-lg transition-colors',
                settings.highContrast
                  ? 'text-yellow-400 hover:bg-yellow-400/20'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
              title="Chiudi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <main
          className={cn(
            'flex-1 overflow-y-auto p-4 space-y-4',
            settings.highContrast ? 'bg-black' : ''
          )}
          id="main-content"
        >
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {/* Avatar for assistant */}
                {message.role === 'assistant' && (
                  <div
                    className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                    style={{ boxShadow: `0 0 0 2px ${maestro.color}` }}
                  >
                    <Image
                      src={maestro.avatar}
                      alt={maestro.name}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Message bubble */}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3 relative group',
                    message.role === 'user'
                      ? settings.highContrast
                        ? 'bg-yellow-400 text-black'
                        : 'bg-blue-500 text-white'
                      : settings.highContrast
                        ? 'bg-gray-900 text-white border border-gray-700'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white',
                    settings.dyslexiaFont && 'tracking-wide'
                  )}
                  style={{
                    lineHeight: settings.lineSpacing,
                  }}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>

                  {/* Copy button */}
                  <button
                    onClick={() => copyMessage(message.content, message.id)}
                    className={cn(
                      'absolute -right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-full transition-opacity',
                      settings.highContrast
                        ? 'bg-yellow-400 text-black'
                        : 'bg-white dark:bg-slate-700 shadow-md'
                    )}
                    title="Copia messaggio"
                  >
                    {copiedId === message.id ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Avatar for user */}
                {message.role === 'user' && (
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      settings.highContrast
                        ? 'bg-yellow-400 text-black'
                        : 'bg-blue-500 text-white'
                    )}
                  >
                    <User className="w-4 h-4" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Tool calls */}
          {toolCalls.length > 0 && (
            <div className="space-y-3">
              {toolCalls.map((toolCall) => (
                <ToolResultDisplay key={toolCall.id} toolCall={toolCall} />
              ))}
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div
                className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                style={{ boxShadow: `0 0 0 2px ${maestro.color}` }}
              >
                <Image
                  src={maestro.avatar}
                  alt={maestro.name}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
              <div
                className={cn(
                  'rounded-2xl px-4 py-3 flex items-center gap-2',
                  settings.highContrast
                    ? 'bg-gray-900 border border-gray-700'
                    : 'bg-slate-100 dark:bg-slate-800'
                )}
              >
                <Loader2
                  className={cn(
                    'w-4 h-4 animate-spin',
                    settings.highContrast ? 'text-yellow-400' : 'text-blue-500'
                  )}
                />
                <span
                  className={cn(
                    'text-sm',
                    settings.highContrast ? 'text-gray-400' : 'text-slate-500'
                  )}
                >
                  {maestro.name} sta pensando...
                </span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* Input */}
        <footer
          className={cn(
            'border-t p-4',
            settings.highContrast
              ? 'border-yellow-400 bg-black'
              : 'border-slate-200 dark:border-slate-700'
          )}
        >
          <form onSubmit={handleSubmit} className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scrivi un messaggio..."
              rows={1}
              className={cn(
                'flex-1 resize-none rounded-xl px-4 py-3 focus:outline-none focus:ring-2',
                settings.highContrast
                  ? 'bg-gray-900 text-white border-2 border-yellow-400 focus:ring-yellow-400'
                  : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-blue-500',
                settings.dyslexiaFont && 'tracking-wide'
              )}
              style={{
                lineHeight: settings.lineSpacing,
              }}
              disabled={isLoading}
              aria-label="Messaggio"
            />

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                'px-4 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                settings.highContrast
                  ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              )}
              style={{ backgroundColor: input.trim() ? maestro.color : undefined }}
              aria-label="Invia messaggio"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>

          {/* Hint */}
          <p
            className={cn(
              'text-xs mt-2 text-center',
              settings.highContrast ? 'text-gray-500' : 'text-slate-400'
            )}
          >
            Premi Invio per inviare, Shift+Invio per andare a capo
          </p>
        </footer>
      </motion.div>
    </motion.div>
  );
}
