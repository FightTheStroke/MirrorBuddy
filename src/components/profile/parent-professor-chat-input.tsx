'use client';

import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  value: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * Input area for parent-professor chat
 * Textarea with send button and disclaimer
 */
export function ChatInput({
  value,
  isLoading,
  onChange,
  onSend,
  onKeyDown,
  inputRef,
}: ChatInputProps) {
  return (
    <div className="flex-shrink-0 p-4 border-t bg-white dark:bg-slate-900">
      <div className="flex gap-2">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Scrivi un messaggio..."
          className="flex-1 resize-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={2}
          disabled={isLoading}
        />
        <Button
          onClick={onSend}
          disabled={!value.trim() || isLoading}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
      <p className="text-xs text-slate-500 mt-2 text-center">
        Le risposte sono generate da AI e potrebbero contenere imprecisioni.
      </p>
    </div>
  );
}
