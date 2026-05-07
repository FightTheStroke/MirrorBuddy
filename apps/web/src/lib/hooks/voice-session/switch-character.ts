// ============================================================================
// SWITCH CHARACTER (PERSISTENT WEBRTC)
// Sends session.update with new character config without tearing down
// the WebRTC connection. Keeps audio contexts and data channel alive.
// ============================================================================

'use client';

import { useCallback } from 'react';
import { clientLogger as logger } from '@/lib/logger/client';
import type { Maestro } from '@/types';
import { performCancelResponse, type ActionRefs } from './actions';

interface SwitchCharacterDeps extends ActionRefs {
  maestroRef: React.MutableRefObject<Maestro | null>;
  greetingSentRef: React.MutableRefObject<boolean>;
  sessionReadyRef: React.MutableRefObject<boolean>;
  sendSessionConfigRef: React.MutableRefObject<(() => void) | null>;
  switchCharacterStore: (maestro: Maestro) => void;
  setSpeaking: (value: boolean) => void;
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

      // Cancel any in-flight response from the previous maestro and flush
      // buffered audio. Without this, Azure keeps streaming the old voice's
      // audio frames into the same WebRTC remote track while the new
      // session.update provokes a second response, and the two voices overlap.
      performCancelResponse(deps, deps.setSpeaking);

      // eslint-disable-next-line react-hooks/immutability -- Intentional ref mutation for character switch
      deps.maestroRef.current = maestro;
      deps.greetingSentRef.current = false;
      deps.sessionReadyRef.current = false;

      deps.switchCharacterStore(maestro);

      if (deps.sendSessionConfigRef.current) {
        deps.sendSessionConfigRef.current();
      }

      return true;
    },
    [deps],
  );
}
