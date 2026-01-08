/**
 * @file chat-input.tsx
 * @brief Chat input component
 */

import { useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToolButtons } from '../../tool-buttons';
import type { ToolType, ToolState } from '@/types/tools';
import type { CharacterInfo } from '../utils/character-utils';

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  character: CharacterInfo;
  characterType: 'coach' | 'buddy';
  onToolRequest: (toolType: ToolType) => void;
  activeTool: ToolState | null;
}

export function ChatInput({
  input,
  onInputChange,
  onSend,
  onKeyDown,
  isLoading,
  character,
  characterType,
  onToolRequest,
  activeTool,
}: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
      {characterType === 'coach' && (
        <div className="mb-2">
          <ToolButtons
            onToolRequest={onToolRequest}
            disabled={isLoading}
            activeToolId={activeTool?.id}
          />
        </div>
      )}
      <div className="flex gap-3">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            'Scrivi un messaggio a ' + character.name + '...'
          }
          className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-themed"
          rows={1}
          disabled={isLoading}
        />
        <Button
          onClick={onSend}
          disabled={!input.trim() || isLoading}
          className="bg-accent-themed hover:bg-accent-themed/90"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}

