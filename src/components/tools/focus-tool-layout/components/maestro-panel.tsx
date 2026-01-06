/**
 * @file maestro-panel.tsx
 * @brief Maestro panel component
 */

import { Loader2, Phone, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChatMessages } from './chat-messages';
import { ChatInput } from './chat-input';

interface CharacterProps {
  name: string;
  avatar: string;
  color: string;
}

interface MaestroPanelProps {
  characterProps: CharacterProps | null;
  voiceConnected: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  inputLevel: number;
  isVoiceActive: boolean;
  configError: string | null;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  isLoading: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onVoiceToggle: () => void;
  onToggleMute: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function MaestroPanel({
  characterProps,
  voiceConnected,
  isSpeaking,
  isMuted,
  inputLevel,
  isVoiceActive,
  configError,
  messages,
  isLoading,
  input,
  onInputChange,
  onSend,
  onVoiceToggle,
  onToggleMute,
  messagesEndRef,
  inputRef,
}: MaestroPanelProps) {
  if (!characterProps) return null;

  return (
    <div className="w-[30%] max-w-md h-full flex flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700"
        style={{ backgroundColor: `${characterProps.color}10` }}
      >
        <div className="relative flex-shrink-0">
          <div
            className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
            style={{ borderColor: characterProps.color }}
          >
            <div
              className="w-full h-full bg-cover bg-center"
              style={{
                backgroundImage: `url(${characterProps.avatar})`,
                backgroundColor: characterProps.color,
              }}
            />
          </div>
          {voiceConnected && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base text-slate-900 dark:text-white truncate">
            {characterProps.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {voiceConnected
              ? isSpeaking
                ? 'Sta parlando...'
                : 'In chiamata'
              : 'Sono qui per aiutarti'}
          </p>
        </div>

        <Button
          variant={voiceConnected ? 'destructive' : 'outline'}
          size="icon"
          onClick={onVoiceToggle}
          disabled={!!configError && !isVoiceActive}
          className={cn('relative', voiceConnected && 'animate-pulse')}
          style={
            !voiceConnected
              ? { borderColor: characterProps.color, color: characterProps.color }
              : undefined
          }
          title={voiceConnected ? 'Termina chiamata' : `Chiama ${characterProps.name}`}
        >
          {isVoiceActive && !voiceConnected ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : voiceConnected ? (
            <PhoneOff className="h-4 w-4" />
          ) : (
            <Phone className="h-4 w-4" />
          )}
        </Button>

        {voiceConnected && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMute}
            className={cn(isMuted && 'text-red-500')}
            title={isMuted ? 'Attiva microfono' : 'Disattiva microfono'}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {voiceConnected && !isMuted && (
        <div className="flex-shrink-0 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Volume2 className="h-3 w-3 text-slate-400" />
            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-75"
                style={{ width: `${Math.min(inputLevel * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <ChatMessages
        messages={messages}
        isLoading={isLoading}
        characterColor={characterProps.color}
        messagesEndRef={messagesEndRef}
      />

      <ChatInput
        input={input}
        onInputChange={onInputChange}
        onSend={onSend}
        isLoading={isLoading}
        characterName={characterProps.name}
        characterColor={characterProps.color}
        inputRef={inputRef}
      />
    </div>
  );
}

