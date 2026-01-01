'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import type { ActiveCharacter } from '@/lib/stores/conversation-flow-store';
import type { Maestro, MaestroVoice, Subject } from '@/types';
import { useVoiceSession } from '@/lib/hooks/use-voice-session';
import { CharacterAvatar } from './character-avatar';
import { CharacterRoleBadge } from './character-role-badge';
import { CHARACTER_AVATARS } from './constants';

/**
 * Voice connection info from /api/realtime/token
 */
interface VoiceConnectionInfo {
  provider: 'azure';
  proxyPort: number;
  configured: boolean;
}

/**
 * Convert ActiveCharacter to Maestro-compatible interface for voice session.
 * Coach and Buddy have all the required voice fields.
 */
function activeCharacterToMaestro(character: ActiveCharacter): Maestro {
  return {
    id: character.id,
    name: character.name,
    subject: 'methodology' as Subject, // Coaches/buddies aren't subject-specific
    specialty: character.type === 'coach' ? 'Metodo di studio' : 'Supporto emotivo',
    voice: (character.voice || 'alloy') as MaestroVoice,
    voiceInstructions: character.voiceInstructions || '',
    teachingStyle: character.type === 'coach' ? 'scaffolding' : 'peer-support',
    avatar: CHARACTER_AVATARS[character.id] || '/avatars/default.jpg',
    color: character.color,
    systemPrompt: character.systemPrompt,
    greeting: character.greeting,
  };
}

interface VoiceCallOverlayProps {
  character: ActiveCharacter;
  onEnd: () => void;
}

/**
 * Voice call overlay with actual Azure Realtime voice session.
 * Issue #34: Now integrates with useVoiceSession hook.
 */
export function VoiceCallOverlay({
  character,
  onEnd,
}: VoiceCallOverlayProps) {
  const [connectionInfo, setConnectionInfo] = useState<VoiceConnectionInfo | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const hasAttemptedConnection = useRef(false);

  const {
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    transcript,
    inputLevel,
    connectionState,
    connect,
    disconnect,
    toggleMute,
  } = useVoiceSession({
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Voice call error', { message });
      setConfigError(message || 'Errore di connessione vocale');
    },
    onTranscript: (role, text) => {
      logger.debug('Voice transcript', { role, text: text.substring(0, 100) });
    },
  });

  // Fetch connection info on mount
  useEffect(() => {
    async function fetchConnectionInfo() {
      try {
        const response = await fetch('/api/realtime/token');
        const data = await response.json();
        if (data.error) {
          logger.error('Voice API error', { error: data.error });
          setConfigError(data.message || 'Servizio vocale non configurato');
          return;
        }
        setConnectionInfo(data as VoiceConnectionInfo);
      } catch (error) {
        logger.error('Failed to get voice connection info', { error: String(error) });
        setConfigError('Impossibile connettersi al servizio vocale');
      }
    }
    fetchConnectionInfo();
  }, []);

  // Connect when connection info is available
  useEffect(() => {
    const startConnection = async () => {
      if (hasAttemptedConnection.current) return;
      if (!connectionInfo || isConnected || connectionState !== 'idle') return;

      hasAttemptedConnection.current = true;

      try {
        // Convert character to Maestro-compatible interface
        const maestroLike = activeCharacterToMaestro(character);
        await connect(maestroLike, connectionInfo);
      } catch (error) {
        logger.error('Voice connection failed', { error: String(error) });
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          setConfigError('Microfono non autorizzato. Abilita il microfono nelle impostazioni del browser.');
        } else {
          setConfigError('Errore di connessione vocale');
        }
      }
    };

    startConnection();
  }, [connectionInfo, isConnected, connectionState, character, connect]);

  // Handle end call
  const handleEndCall = useCallback(() => {
    disconnect();
    onEnd();
  }, [disconnect, onEnd]);

  // Status text
  const getStatusText = () => {
    if (configError) return configError;
    if (connectionState === 'connecting') return 'Connessione in corso...';
    if (isConnected && isSpeaking) return `${character.name} sta parlando...`;
    if (isConnected && isListening) return 'In ascolto...';
    if (isConnected) return 'Connesso';
    return 'Avvio chiamata...';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900/95 to-slate-800/95 backdrop-blur-sm"
    >
      <motion.div
        animate={{ scale: isSpeaking ? [1, 1.05, 1] : 1 }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <CharacterAvatar character={character} size="xl" showStatus isActive={isConnected} />
      </motion.div>

      <h3 className="mt-4 text-xl font-semibold text-white">{character.name}</h3>
      <CharacterRoleBadge type={character.type} />

      <p className={cn(
        "mt-2 text-sm",
        configError ? "text-red-400" : "text-slate-300"
      )}>
        {getStatusText()}
      </p>

      {/* Input level indicator */}
      {isConnected && isListening && (
        <div className="mt-4 flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              backgroundColor: inputLevel > 0.1 ? '#22c55e' : '#64748b',
              transform: `scale(${1 + inputLevel * 2})`
            }}
          />
          <span className="text-xs text-green-400">
            {isMuted ? 'Microfono disattivato' : 'In ascolto'}
          </span>
        </div>
      )}

      {/* Transcript preview */}
      {transcript.length > 0 && (
        <div className="mt-4 max-w-md px-4 py-2 bg-slate-800/50 rounded-lg max-h-32 overflow-y-auto">
          <p className="text-xs text-slate-400">
            {transcript[transcript.length - 1]?.content.substring(0, 150)}
            {(transcript[transcript.length - 1]?.content.length || 0) > 150 && '...'}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="mt-8 flex items-center gap-4">
        {isConnected && (
          <Button
            variant={isMuted ? 'destructive' : 'outline'}
            size="lg"
            onClick={toggleMute}
            aria-label={isMuted ? 'Attiva microfono' : 'Disattiva microfono'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
        )}

        <Button
          variant="destructive"
          size="lg"
          onClick={handleEndCall}
        >
          <PhoneOff className="w-5 h-5 mr-2" />
          Termina chiamata
        </Button>
      </div>
    </motion.div>
  );
}
