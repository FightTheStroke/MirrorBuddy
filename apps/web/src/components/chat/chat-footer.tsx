'use client';

import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('chat');

  return (
    <footer
      className={cn(
        'border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]',
        highContrast ? 'border-yellow-400 bg-black' : 'border-slate-200 dark:border-slate-700',
      )}
    >
      <form onSubmit={onSubmit} className="flex gap-3 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('input.placeholder')}
          rows={3}
          className={cn(
            'flex-1 resize-none rounded-xl px-4 py-3 min-h-[120px] md:min-h-0 md:rows-1 focus:outline-none focus:ring-2',
            highContrast
              ? 'bg-gray-900 text-white border-2 border-yellow-400 focus:ring-yellow-400'
              : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-blue-500',
            dyslexiaFont && 'tracking-wide',
          )}
          style={{ lineHeight: lineSpacing }}
          disabled={isLoading}
          aria-label={t('footer.messageAriaLabel')}
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={cn(
            'h-11 w-11 flex items-center justify-center rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0',
            highContrast
              ? 'bg-yellow-400 text-black hover:bg-yellow-300'
              : 'bg-accent-themed text-white hover:brightness-110',
          )}
          style={{ backgroundColor: input.trim() ? maestroColor : undefined }}
          aria-label={t('footer.sendMessageAriaLabel')}
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

      {/* Hint - hide on mobile */}
      <p
        className={cn(
          'text-xs mt-2 text-center hidden md:block',
          highContrast ? 'text-gray-500' : 'text-slate-400',
        )}
      >
        {t('footer.keyboardHint')}
      </p>
    </footer>
  );
}
