// ============================================================================
// SWITCH CHARACTER (PERSISTENT WEBRTC)
// Sends session.update with new character config without tearing down
// the WebRTC connection. Keeps audio contexts and data channel alive.
// ============================================================================

'use client';

import { useCallback } from 'react';
import { clientLogger as logger } from '@/lib/logger/client';
import type { Maestro } from '@/types';

interface SwitchCharacterDeps {
  webrtcDataChannelRef: React.MutableRefObject<RTCDataChannel | null>;
  maestroRef: React.MutableRefObject<Maestro | null>;
  greetingSentRef: React.MutableRefObject<boolean>;
  sessionReadyRef: React.MutableRefObject<boolean>;
  sendSessionConfigRef: React.MutableRefObject<(() => void) | null>;
  switchCharacterStore: (maestro: Maestro) => void;
}

/**
 * Switch to a different character on an existing WebRTC connection.
 * Sends session.update with new instructions/voice instead of reconnecting.
 * Returns false if connection is not active (caller should use connect() instead).
 */
export function useSwitchCharacter(deps: SwitchCharacterDeps) {
  return useCallback(
    (maestro: Maestro): boolean => {
      const dc = deps.webrtcDataChannelRef.current;

      if (!dc || dc.readyState !== 'open') {
        logger.warn('[VoiceSession] switchCharacter: no active data channel, use connect()');
        return false;
      }

      logger.info('[VoiceSession] Switching character via session.update', {
        from: deps.maestroRef.current?.id,
        to: maestro.id,
      });

      // Update refs for the new character
      // eslint-disable-next-line react-hooks/immutability -- Intentional ref mutation for character switch
      deps.maestroRef.current = maestro;
      deps.greetingSentRef.current = false;
      deps.sessionReadyRef.current = false;

      // Update store (clears transcript/tools, keeps connection)
      deps.switchCharacterStore(maestro);

      // Re-send session config via existing data channel
      // This triggers useSendSessionConfig which builds new instructions
      if (deps.sendSessionConfigRef.current) {
        deps.sendSessionConfigRef.current();
      }

      return true;
    },
    [deps],
  );
}
