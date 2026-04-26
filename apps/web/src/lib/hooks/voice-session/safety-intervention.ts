/**
 * Voice Session Safety Intervention
 * Handles safe-response redirect flow when safety violations are detected
 *
 * Related: Plan 148 W2 T2-06 - Safe-response redirect flow
 * Compliance: VCE-004 logging checkpoint (EU AI Act Art. 14, 72)
 *
 * Flow:
 * 1. Send response.cancel via data channel to stop current response
 * 2. Send response.create with a safe educational redirect message
 * 3. Log VCE-004 compliance event
 * 4. Update UI warning state
 * 5. Guard behind voice_transcript_safety flag
 */

'use client';

import { clientLogger as logger } from '@/lib/logger/client';
import { isFeatureEnabled } from '@/lib/feature-flags/client';
import type { TranscriptSafetyResult } from './transcript-safety';

/**
 * UI warning state for safety violations
 */
export interface SafetyWarningState {
  active: boolean;
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  flaggedPatterns: string[];
  message?: string;
}

/**
 * Parameters for triggering safety intervention
 */
export interface SafetyInterventionParams {
  /** Voice session ID for logging correlation */
  sessionId: string;
  /** Safety check result that triggered intervention */
  safetyResult: TranscriptSafetyResult;
  /** WebRTC data channel for sending cancellation and redirect */
  dataChannel: RTCDataChannel | null;
  /** Callback to update UI warning state */
  setWarningState: (state: SafetyWarningState) => void;
}

/**
 * Intervention reason taxonomy aligned with VCE-004 spec
 * Maps flagged patterns to intervention reasons
 */
function getInterventionReason(flaggedPatterns: string[]): string {
  if (flaggedPatterns.includes('crisis')) {
    return 'crisis_detected';
  }
  if (flaggedPatterns.includes('bias')) {
    return 'bias_detected';
  }
  if (flaggedPatterns.includes('age_inappropriate') || flaggedPatterns.includes('explicit')) {
    return 'age_inappropriate';
  }
  // Default to content policy violation
  return 'content_policy_violation';
}

/**
 * Generate safe educational redirect message based on flagged pattern
 * Messages are in Italian (primary locale) with educational tone
 */
function getRedirectMessage(flaggedPatterns: string[]): string {
  if (flaggedPatterns.includes('violence')) {
    return 'Ho notato contenuti che riguardano la violenza. Come Maestro, preferisco concentrarmi su argomenti educativi e costruttivi. Posso aiutarti con qualcosa di diverso?';
  }

  if (flaggedPatterns.includes('crisis')) {
    return 'Sembra che tu stia attraversando un momento difficile. Come Maestro digitale, vorrei supportarti in modo appropriato. Ti consiglio di parlare con un adulto di fiducia o contattare un servizio di supporto professionale. Posso aiutarti con altri argomenti educativi?';
  }

  if (flaggedPatterns.includes('explicit') || flaggedPatterns.includes('age_inappropriate')) {
    return "Questo argomento non è appropriato per una piattaforma educativa. Sono qui per aiutarti con lo studio e l'apprendimento. Su cosa posso aiutarti oggi?";
  }

  if (flaggedPatterns.includes('bias')) {
    return 'Ho notato un linguaggio che potrebbe contenere pregiudizi. Come Maestro, promuovo un apprendimento inclusivo e rispettoso. Possiamo riformulare la domanda in modo più neutrale?';
  }

  if (flaggedPatterns.includes('jailbreak')) {
    return 'Ho notato un tentativo di modificare il mio comportamento. Sono progettato per aiutarti con lo studio in modo sicuro e appropriato. Come posso supportarti nel tuo apprendimento?';
  }

  if (flaggedPatterns.includes('profanity')) {
    return 'Usiamo un linguaggio rispettoso per mantenere un ambiente di apprendimento positivo. Come posso aiutarti con i tuoi studi?';
  }

  // Default educational redirect
  return "Mi dispiace, ma non posso aiutarti con questo argomento. Sono qui per supportare il tuo apprendimento in modo sicuro e appropriato. C'è qualcos'altro su cui posso aiutarti?";
}

/**
 * Trigger safety intervention in voice session
 * Implements safe-response redirect flow with compliance logging
 *
 * @param params - Intervention parameters including session ID, safety result, data channel, and UI callback
 *
 * @example
 * const safetyResult = checkUserTranscript(sessionId, transcript);
 * if (safetyResult.actionTaken !== 'allow') {
 *   triggerSafetyIntervention({
 *     sessionId,
 *     safetyResult,
 *     dataChannel: webrtcDataChannelRef.current,
 *     setWarningState: (state) => setVoiceSafetyWarning(state),
 *   });
 * }
 */
export function triggerSafetyIntervention(params: SafetyInterventionParams): void {
  const { sessionId, safetyResult, dataChannel, setWarningState } = params;

  // Check feature flag - if disabled, no intervention
  const flagResult = isFeatureEnabled('voice_transcript_safety');
  if (!flagResult.enabled) {
    logger.debug('[SafetyIntervention] Feature disabled, skipping intervention', { sessionId });
    return;
  }

  // Only intervene for non-allow actions
  if (safetyResult.actionTaken === 'allow') {
    logger.debug('[SafetyIntervention] Action is allow, no intervention needed', { sessionId });
    return;
  }

  // Validate data channel
  if (!dataChannel || dataChannel.readyState !== 'open') {
    logger.warn('[SafetyIntervention] Data channel not available, cannot send intervention', {
      sessionId,
      readyState: dataChannel?.readyState || 'null',
    });
    return;
  }

  try {
    // Step 1: Send response.cancel to stop current assistant response
    const cancelMessage = JSON.stringify({ type: 'response.cancel' });
    dataChannel.send(cancelMessage);
    logger.debug('[SafetyIntervention] Sent response.cancel', { sessionId });

    // Step 2: Generate and send safe educational redirect message
    const redirectMessage = getRedirectMessage(safetyResult.flaggedPatterns);
    const createMessage = JSON.stringify({
      type: 'response.create',
      response: {
        modalities: ['audio', 'text'],
        instructions: redirectMessage,
      },
    });
    dataChannel.send(createMessage);
    logger.debug('[SafetyIntervention] Sent safe redirect message', {
      sessionId,
      messagePreview: redirectMessage.substring(0, 50),
    });

    // Step 3: Log VCE-004 compliance event
    const interventionReason = getInterventionReason(safetyResult.flaggedPatterns);
    logger.warn('[SafetyIntervention] Safety intervention activated', {
      component: 'voice-safety-intervention',
      eventId: 'VCE-004',
      eventName: 'Safety Intervention Activated',
      sessionId,
      interventionReason,
      flaggedPatterns: safetyResult.flaggedPatterns,
      detectedSeverity: safetyResult.severity,
      redirectMessage,
      timestamp: Date.now(),
      // Do NOT log originalTranscript (GDPR Art. 25 - data minimization)
    });

    // Step 4: Update UI warning state
    setWarningState({
      active: true,
      severity: safetyResult.severity,
      flaggedPatterns: safetyResult.flaggedPatterns,
      message: redirectMessage,
    });

    logger.info('[SafetyIntervention] Intervention complete', {
      sessionId,
      interventionReason,
      severity: safetyResult.severity,
    });
  } catch (error) {
    logger.error('[SafetyIntervention] Error during intervention', {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - intervention failure should not crash voice session
  }
}
