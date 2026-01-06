/**
 * @file chat-input.tsx
 * @brief Chat input component
 */

import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  characterName: string;
  characterColor: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function ChatInput({
  input,
  onInputChange,
  onSend,
  isLoading,
  characterName,
  characterColor,
  inputRef,
}: ChatInputProps) {
  return (
    <div className="flex-shrink-0 p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={`Scrivi a ${characterName}...`}
          className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl border-0 focus:ring-2 outline-none text-sm transition-all"
          style={
            {
              '--tw-ring-color': characterColor || '#3b82f6',
            } as React.CSSProperties
          }
          disabled={isLoading}
        />
        <Button
          size="icon"
          onClick={onSend}
          disabled={!input.trim() || isLoading}
          className="flex-shrink-0 shadow-sm"
          style={{
            backgroundColor: characterColor || '#3b82f6',
          }}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

