import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import type { VoiceConnectionInfo } from '../types';

// Onboarding is UI-only (no voice). The realtime WebRTC connection can fail
// AFTER a successful token fetch (the token check here only catches config /
// rate-limit errors, not a failed SDP/ICE negotiation) — which left a child
// stranded on a broken voice step with no way forward. Every child must be
// able to complete onboarding via the accessible InfoStepForm / WelcomeStep
// form path, which collects the same data (name, age, school, learning
// differences) without a microphone. Flip this to true to restore
// voice-guided onboarding once realtime reliability is verified on-device
// (issue #469 / T6.3).
const ONBOARDING_VOICE_ENABLED = false;

export function useVoiceConnection(enabled = true) {
  const [connectionInfo, setConnectionInfo] = useState<VoiceConnectionInfo | null>(null);
  // When voice onboarding is disabled we've effectively already "decided": no
  // Azure check is pending (so the page doesn't wait on it) and the UI form is
  // the path from first paint.
  const [hasCheckedAzure, setHasCheckedAzure] = useState(!ONBOARDING_VOICE_ENABLED);
  const [useWebSpeechFallback, setUseWebSpeechFallback] = useState(!ONBOARDING_VOICE_ENABLED);

  useEffect(() => {
    if (!enabled || !ONBOARDING_VOICE_ENABLED) return;

    async function fetchConnectionInfo() {
      try {
        // Check for sessionStorage availability (SSR guard)
        const cached =
          typeof window !== 'undefined' ? sessionStorage.getItem('voice-connection-info') : null;

        if (cached) {
          try {
            const data = JSON.parse(cached);
            if (data.provider && data.proxyPort !== undefined) {
              setConnectionInfo(data as VoiceConnectionInfo);
              setHasCheckedAzure(true);
              return;
            }
          } catch {
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('voice-connection-info');
            }
          }
        }

        const response = await fetch('/api/realtime/token');
        const data = await response.json();

        if (response.status === 429) {
          logger.warn('[WelcomePage] Rate limit exceeded, using Web Speech fallback');
          setHasCheckedAzure(true);
          setUseWebSpeechFallback(true);
          return;
        }

        if (data.error) {
          logger.warn('[WelcomePage] Voice API not available, using Web Speech fallback');
          setHasCheckedAzure(true);
          setUseWebSpeechFallback(true);
          return;
        }

        if (typeof window !== 'undefined') {
          sessionStorage.setItem('voice-connection-info', JSON.stringify(data));
        }
        setConnectionInfo(data as VoiceConnectionInfo);
        setHasCheckedAzure(true);
      } catch (error) {
        logger.warn('[WelcomePage] Voice API unavailable, using Web Speech fallback', {
          error: String(error),
        });
        setHasCheckedAzure(true);
        setUseWebSpeechFallback(true);
      }
    }
    fetchConnectionInfo();
  }, [enabled]);

  return {
    connectionInfo,
    hasCheckedAzure,
    useWebSpeechFallback,
    setUseWebSpeechFallback,
  };
}
