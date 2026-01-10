import { Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ToolButtons } from '../tool-buttons';
import type { ToolType } from '@/types/tools';
import type { ActiveCharacter } from '@/lib/stores/conversation-flow-store';

interface ConversationInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  activeCharacter: ActiveCharacter;
  mode: 'text' | 'voice';
  isMuted: boolean;
  onVoiceToggle: () => void;
  onMuteToggle: () => void;
  onToolRequest: (toolType: ToolType) => void;
  activeToolId?: string;
  inputRef: React.RefObject<HTMLInputElement>;
}

export function ConversationInput({
  inputValue,
  onInputChange,
  onSend,
  onKeyPress,
  isLoading,
  activeCharacter,
  mode,
  isMuted,
  onVoiceToggle,
  onMuteToggle,
  onToolRequest,
  activeToolId,
  inputRef,
}: ConversationInputProps) {
  return (
    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
      <div className="mb-2">
        <ToolButtons
          onToolRequest={onToolRequest}
          disabled={isLoading}
          activeToolId={activeToolId}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyPress}
          placeholder={`Scrivi a ${activeCharacter.name}...`}
          aria-label={`Scrivi un messaggio a ${activeCharacter.name}`}
          className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl border-0 focus:ring-2 focus:ring-accent-themed outline-none text-slate-900 dark:text-white placeholder:text-slate-500"
          disabled={isLoading}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onMuteToggle}
          aria-label={isMuted ? 'Attiva audio' : 'Disattiva audio'}
          aria-pressed={isMuted}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onVoiceToggle}
          aria-label={mode === 'voice' ? 'Passa al testo' : 'Passa alla voce'}
          aria-pressed={mode === 'voice'}
          className={cn(mode === 'voice' && 'bg-red-100 text-red-600')}
        >
          {mode === 'voice' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>
        <Button
          size="icon"
          onClick={onSend}
          disabled={!inputValue.trim() || isLoading}
          aria-label="Invia messaggio"
          className="bg-accent-themed hover:bg-accent-themed/90"
        >
          <Send className="w-5 h-5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

