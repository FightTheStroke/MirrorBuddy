'use client';

import { useState, useCallback } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InputBarProps {
  onSendMessage: (message: string) => void;
  onVoiceToggle?: () => void;
  isVoiceActive?: boolean;
  maestroColor: string;
  placeholder?: string;
}

export function InputBar({
  onSendMessage,
  onVoiceToggle,
  isVoiceActive,
  maestroColor,
  placeholder = 'Chiedi al Professore...',
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
