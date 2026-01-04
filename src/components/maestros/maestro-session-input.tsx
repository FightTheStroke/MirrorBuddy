'use client';

import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MaestroSessionToolButtons } from './maestro-session-tool-buttons';
import type { Maestro } from '@/types';

type ToolType = 'mindmap' | 'quiz' | 'flashcards' | 'demo' | 'search' | 'summary' | 'diagram' | 'timeline';

interface MaestroSessionInputProps {
  maestro: Maestro;
  input: string;
  isLoading: boolean;
  sessionEnded: boolean;
  isVoiceActive: boolean;
  showEndSession: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSubmit: () => void;
  onRequestTool: (tool: ToolType) => void;
  onRequestPhoto: () => void;
  onEndSession: () => void;
}

export function MaestroSessionInput({
  maestro,
  input,
  isLoading,
  sessionEnded,
  isVoiceActive,
  showEndSession,
  inputRef,
  onInputChange,
  onKeyDown,
  onSubmit,
  onRequestTool,
  onRequestPhoto,
  onEndSession,
}: MaestroSessionInputProps) {
  return (
    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
      {/* Tool buttons */}
      <MaestroSessionToolButtons
        isLoading={isLoading}
        sessionEnded={sessionEnded}
        onRequestTool={onRequestTool}
        onRequestPhoto={onRequestPhoto}
      />

      <div className="flex gap-3">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            sessionEnded
              ? 'Sessione terminata - Clicca "Nuova conversazione" per ricominciare'
              : isVoiceActive
                ? 'Parla o scrivi...'
                : `Scrivi un messaggio a ${maestro.name}...`
          }
          className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': maestro.color } as React.CSSProperties}
          rows={1}
          disabled={isLoading || sessionEnded}
        />
        <Button
          onClick={onSubmit}
          disabled={!input.trim() || isLoading || sessionEnded}
          style={{ backgroundColor: maestro.color }}
          className="hover:opacity-90"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* End session button */}
      {showEndSession && (
        <div className="flex justify-center mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onEndSession}
            className="text-slate-600"
          >
            Termina sessione e valuta
          </Button>
        </div>
      )}
    </div>
  );
}
