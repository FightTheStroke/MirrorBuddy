'use client';

import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

interface ChatFooterProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  highContrast: boolean;
  dyslexiaFont: boolean;
  lineSpacing: number;
  maestroColor: string;
}

export function ChatFooter({
  input,
  onInputChange,
  onSubmit,
  onKeyDown,
  isLoading,
  inputRef,
  highContrast,
  dyslexiaFont,
  lineSpacing,
  maestroColor,
}: ChatFooterProps) {
  return (
    <footer
      className={cn(
        'border-t p-4',
        highContrast
          ? 'border-yellow-400 bg-black'
          : 'border-slate-200 dark:border-slate-700'
      )}
    >
      <form onSubmit={onSubmit} className="flex gap-3">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Scrivi un messaggio..."
          rows={1}
          className={cn(
            'flex-1 resize-none rounded-xl px-4 py-3 focus:outline-none focus:ring-2',
            highContrast
              ? 'bg-gray-900 text-white border-2 border-yellow-400 focus:ring-yellow-400'
              : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-blue-500',
            dyslexiaFont && 'tracking-wide'
          )}
          style={{ lineHeight: lineSpacing }}
          disabled={isLoading}
          aria-label="Messaggio"
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={cn(
            'px-4 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            highContrast
              ? 'bg-yellow-400 text-black hover:bg-yellow-300'
              : 'bg-accent-themed text-white hover:brightness-110'
          )}
          style={{ backgroundColor: input.trim() ? maestroColor : undefined }}
          aria-label="Invia messaggio"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

      {/* Hint */}
      <p
        className={cn(
          'text-xs mt-2 text-center',
          highContrast ? 'text-gray-500' : 'text-slate-400'
        )}
      >
        Premi Invio per inviare, Shift+Invio per andare a capo
      </p>
    </footer>
  );
}
