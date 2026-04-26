import { Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ToolButtons } from '../tool-buttons';
import type { ToolType } from '@/types/tools';
import type { ActiveCharacter } from '@/lib/stores/conversation-flow-store';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('chat');

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
          placeholder={t('conversationInput.placeholderTemplate', { name: activeCharacter.name })}
          aria-label={t('conversationInput.ariaLabelTemplate', { name: activeCharacter.name })}
          className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl border-0 focus:ring-2 focus:ring-accent-themed outline-none text-slate-900 dark:text-white placeholder:text-slate-500"
          disabled={isLoading}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onMuteToggle}
          aria-label={
            isMuted
              ? t('conversationInput.enableAudioAriaLabel')
              : t('conversationInput.disableAudioAriaLabel')
          }
          aria-pressed={isMuted}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onVoiceToggle}
          aria-label={
            mode === 'voice'
              ? t('conversationInput.switchToTextAriaLabel')
              : t('conversationInput.switchToVoiceAriaLabel')
          }
          aria-pressed={mode === 'voice'}
          className={cn(mode === 'voice' && 'bg-red-100 text-red-600')}
        >
          {mode === 'voice' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>
        <Button
          size="icon"
          onClick={onSend}
          disabled={!inputValue.trim() || isLoading}
          aria-label={t('conversationInput.sendMessageAriaLabel')}
          className="bg-accent-themed hover:bg-accent-themed/90"
        >
          <Send className="w-5 h-5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
