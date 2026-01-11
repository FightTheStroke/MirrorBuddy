/**
 * Voice connection effects for useCharacterChat
 */

import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import type { ConnectionInfo } from '@/lib/hooks/use-voice-session';
import type { CharacterInfo } from '../../utils/character-utils';
import { characterToMaestro } from '../../utils/character-utils';
import { fetchVoiceConnectionInfo, handleMicrophoneError } from './voice-handler';

interface VoiceEffectsParams {
  isVoiceActive: boolean;
  connectionInfo: ConnectionInfo | null;
  isConnected: boolean;
  connectionState: string;
  character: CharacterInfo;
  characterId: string;
  hasAttemptedConnectionRef: React.MutableRefObject<boolean>;
  setConnectionInfo: (info: ConnectionInfo | null) => void;
  setConfigError: (error: string | null) => void;
  connect: (maestro: ReturnType<typeof characterToMaestro>, info: ConnectionInfo) => Promise<void>;
}

/**
 * Sets up voice connection effects
 */
export function useVoiceEffects({
  isVoiceActive,
  connectionInfo,
  isConnected,
  connectionState,
  character,
  characterId,
  hasAttemptedConnectionRef,
  setConnectionInfo,
  setConfigError,
  connect,
}: VoiceEffectsParams): void {
  // Fetch voice connection info on mount
  useEffect(() => {
    fetchVoiceConnectionInfo().then(({ connectionInfo: info, error }) => {
      if (error) setConfigError(error);
      else if (info) setConnectionInfo(info);
    });
  }, [setConfigError, setConnectionInfo]);

  // Handle voice activation
  useEffect(() => {
    const startConnection = async () => {
      if (!isVoiceActive || hasAttemptedConnectionRef.current) return;
      if (!connectionInfo || isConnected || connectionState !== 'idle') return;

      hasAttemptedConnectionRef.current = true;
      setConfigError(null);

      try {
        const maestroLike = characterToMaestro(character, characterId);
        await connect(maestroLike, connectionInfo);
      } catch (error) {
        logger.error('Voice connection failed', { error: String(error) });
        setConfigError(handleMicrophoneError(error));
      }
    };

    startConnection();
  }, [isVoiceActive, connectionInfo, isConnected, connectionState, character, characterId, connect, hasAttemptedConnectionRef, setConfigError]);

  // Reset connection attempt when voice deactivates
  useEffect(() => {
    if (!isVoiceActive) hasAttemptedConnectionRef.current = false;
  }, [isVoiceActive, hasAttemptedConnectionRef]);
}
