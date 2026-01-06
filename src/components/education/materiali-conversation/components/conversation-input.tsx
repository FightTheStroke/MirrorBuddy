/**
 * @file conversation-input.tsx
 * @brief Conversation input component
 */

import { Paperclip, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Character } from '../types';

interface ConversationInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  showAttachPanel: boolean;
  onToggleAttachPanel: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  attachmentsCount: number;
  isLoading: boolean;
  character: Character;
  highContrast: boolean;
  dyslexiaFont: boolean;
  lineSpacing: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ConversationInput({
  input,
  onInputChange,
  onSubmit,
  onKeyDown,
  showAttachPanel,
  onToggleAttachPanel,
  onFileSelect,
  attachmentsCount,
  isLoading,
  character,
  highContrast,
  dyslexiaFont,
  lineSpacing,
  inputRef,
  fileInputRef,
  cameraInputRef,
}: ConversationInputProps) {
  return (
    <footer
      className={cn(
        'border-t p-4 shrink-0 sticky bottom-0 z-10',
        highContrast
          ? 'border-yellow-400 bg-black'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
      )}
    >
      <form onSubmit={onSubmit} className="flex gap-2 items-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleAttachPanel}
          className={cn(showAttachPanel && 'bg-slate-100 dark:bg-slate-800')}
          aria-label="Allega file"
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Scrivi un messaggio o allega un compito..."
            rows={1}
            className={cn(
              'w-full resize-none rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2',
              highContrast
                ? 'bg-gray-900 text-white border-2 border-yellow-400 focus:ring-yellow-400'
                : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-blue-500',
              dyslexiaFont && 'tracking-wide'
            )}
            style={{ lineHeight: lineSpacing }}
            disabled={isLoading}
            aria-label="Messaggio"
          />
        </div>

        <Button
          type="submit"
          disabled={(!input.trim() && attachmentsCount === 0) || isLoading}
          style={{
            backgroundColor:
              input.trim() || attachmentsCount > 0 ? character.color : undefined,
          }}
          aria-label="Invia messaggio"
        >
          <Send className="w-5 h-5" />
        </Button>
      </form>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx"
        multiple
        onChange={onFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileSelect}
        className="hidden"
      />
    </footer>
  );
}

