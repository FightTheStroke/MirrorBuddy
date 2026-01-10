'use client';

import Image from 'next/image';
import { Volume2, VolumeX, Mic, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Maestro } from '@/types';

interface ChatHeaderProps {
  maestro: Maestro;
  highContrast: boolean;
  dyslexiaFont: boolean;
  ttsEnabled: boolean;
  onClose: () => void;
  onClearChat: () => void;
  onSwitchToVoice?: () => void;
}

export function ChatHeader({
  maestro,
  highContrast,
  dyslexiaFont,
  ttsEnabled,
  onClose,
  onClearChat,
  onSwitchToVoice,
}: ChatHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between px-4 py-3 border-b',
        highContrast
          ? 'border-yellow-400 bg-black'
          : 'border-slate-200 dark:border-slate-700'
      )}
      style={{ backgroundColor: `${maestro.color}10` }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full overflow-hidden"
          style={{ boxShadow: `0 0 0 2px ${maestro.color}` }}
        >
          <Image
            src={maestro.avatar}
            alt={maestro.name}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h2
            id="chat-title"
            className={cn(
              'font-semibold',
              highContrast ? 'text-yellow-400' : 'text-slate-900 dark:text-white',
              dyslexiaFont && 'tracking-wide'
            )}
          >
            {maestro.name}
          </h2>
          <p
            className={cn(
              'text-xs',
              highContrast ? 'text-gray-400' : 'text-slate-500'
            )}
          >
            {maestro.specialty}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* TTS toggle */}
        <button
          onClick={() => (ttsEnabled ? null : null)}
          className={cn(
            'p-2 rounded-lg transition-colors',
            highContrast
              ? 'bg-yellow-400 text-black hover:bg-yellow-300'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
          )}
          title={ttsEnabled ? 'TTS attivo' : 'TTS disattivo'}
        >
          {ttsEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </button>

        {/* Switch to voice */}
        {onSwitchToVoice && (
          <button
            onClick={onSwitchToVoice}
            className={cn(
              'p-2 rounded-lg transition-colors',
              highContrast
                ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                : 'bg-accent-themed text-white hover:brightness-110'
            )}
            title="Passa alla modalità voce"
          >
            <Mic className="w-4 h-4" />
          </button>
        )}

        {/* Clear chat */}
        <button
          onClick={onClearChat}
          className={cn(
            'p-2 rounded-lg transition-colors',
            highContrast
              ? 'text-yellow-400 hover:bg-yellow-400/20'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
          title="Nuova conversazione"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          className={cn(
            'p-2 rounded-lg transition-colors',
            highContrast
              ? 'text-yellow-400 hover:bg-yellow-400/20'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
          title="Chiudi"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
