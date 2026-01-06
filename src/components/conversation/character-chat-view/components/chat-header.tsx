/**
 * @file chat-header.tsx
 * @brief Chat header component
 */

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CharacterInfo } from '../utils/character-utils';

interface ChatHeaderProps {
  character: CharacterInfo;
  isVoiceActive: boolean;
  isConnected: boolean;
  configError: string | null;
  onVoiceCall: () => void;
}

export function ChatHeader({
  character,
  isVoiceActive,
  isConnected,
  configError,
  onVoiceCall,
}: ChatHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-t-2xl bg-gradient-to-r text-white',
        character.color
      )}
    >
      <div className="relative">
        {character.avatar ? (
          <Image
            src={character.avatar}
            alt={character.name}
            width={56}
            height={56}
            className="rounded-full border-2 border-white/30 object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
            {character.name.charAt(0)}
          </div>
        )}
        <span
          className={cn(
            'absolute bottom-0 right-0 w-4 h-4 border-2 border-white rounded-full',
            isVoiceActive && isConnected
              ? 'bg-green-400 animate-pulse'
              : 'bg-green-400'
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-bold truncate">{character.name}</h2>
        <p className="text-sm text-white/80 truncate">
          {isVoiceActive && isConnected
            ? 'In chiamata vocale'
            : character.role}
        </p>
      </div>

      <Button
        variant={isVoiceActive ? 'destructive' : 'ghost'}
        size="icon"
        onClick={onVoiceCall}
        disabled={!!configError && !isVoiceActive}
        aria-label={
          configError && !isVoiceActive
            ? `Voce non disponibile: ${configError}`
            : isVoiceActive
              ? 'Termina chiamata'
              : 'Avvia chiamata vocale'
        }
        title={configError && !isVoiceActive ? configError : undefined}
        className={cn(
          'text-white hover:bg-white/20 transition-all',
          isVoiceActive && 'bg-red-500 hover:bg-red-600 animate-pulse',
          configError && !isVoiceActive && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isVoiceActive ? (
          <PhoneOff className="w-5 h-5" />
        ) : (
          <Phone className="w-5 h-5" />
        )}
      </Button>
    </div>
  );
}

