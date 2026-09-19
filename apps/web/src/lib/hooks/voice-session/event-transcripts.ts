import { clientLogger as logger } from '@/lib/logger/client';
import {
  currentSession as currentMeditation,
  meditationIsArmed,
  stopBrowserMeditation,
} from '@/lib/meditation/browser';
import { isStopIntent } from '@/lib/meditation/stop-intent';
import { checkUserTranscript, checkAssistantTranscript } from './transcript-safety';
import { triggerSafetyIntervention } from './safety-intervention';
import type { EventHandlerDeps } from './event-handlers';
import { createTranscriptSequencer, isAssistantTranscript } from './transcript-sequencer';

export function createTranscriptHandler() {
  const sequencer = createTranscriptSequencer();
  return (event: Record<string, unknown>, deps: EventHandlerDeps, pauseAudio: () => void) => {
    let handled = false;
    for (const ready of sequencer.accept(event, deps.sessionIdRef.current)) {
      handled = handleTranscriptEvent(ready, deps, pauseAudio) || handled;
    }
    // Lifecycle events can flush captions and must still reach the response handler.
    return (
      isAssistantTranscript(event) ||
      (event.type === 'conversation.item.input_audio_transcription.completed' && handled)
    );
  };
}

export function handleTranscriptEvent(
  event: Record<string, unknown>,
  deps: EventHandlerDeps,
  pauseAudio: () => void,
): boolean {
  const user = event.type === 'conversation.item.input_audio_transcription.completed';
  const assistant =
    event.type === 'response.output_audio_transcript.done' ||
    event.type === 'response.audio_transcript.done';
  if (!user && !assistant) return false;
  if (!event.transcript || typeof event.transcript !== 'string') {
    logger.warn(
      user
        ? '[VoiceSession] User transcription completed but no transcript'
        : '[VoiceSession] AI transcript.done but no transcript',
      {
        event: JSON.stringify(event).slice(0, 200),
      },
    );
    return true;
  }
  logger.info(
    user ? '[VoiceSession] User transcript received' : '[VoiceSession] AI transcript received',
    {
      transcript: event.transcript.substring(0, 100),
    },
  );
  if (user) {
    if ((currentMeditation() || meditationIsArmed()) && isStopIntent(event.transcript)) {
      logger.info('[VoiceSession] Meditation ended by the student');
      stopBrowserMeditation();
    }
    const safetyResult = checkUserTranscript(
      deps.sessionIdRef.current || 'unknown',
      event.transcript,
    );
    if (safetyResult.actionTaken !== 'allow') {
      logger.warn('[VoiceSession] Transcript safety check flagged content', {
        sessionId: deps.sessionIdRef.current,
        severity: safetyResult.severity,
        actionTaken: safetyResult.actionTaken,
        flaggedPatterns: safetyResult.flaggedPatterns,
      });
      triggerSafetyIntervention({
        sessionId: deps.sessionIdRef.current || 'unknown',
        safetyResult,
        dataChannel: deps.webrtcDataChannelRef.current,
        setWarningState: deps.setSafetyWarning,
        pauseAudio,
        maestroId: deps.maestroRef.current?.id,
      });
    }
    deps.addTranscript('user', event.transcript);
    deps.options.onTranscript?.('user', event.transcript);
    return true;
  }
  const assistantSafetyResult = checkAssistantTranscript(
    deps.sessionIdRef.current || 'unknown',
    event.transcript,
  );
  if (assistantSafetyResult.actionTaken === 'reject') {
    logger.error('[VoiceSession] Assistant transcript rejected by safety check', {
      sessionId: deps.sessionIdRef.current,
      severity: assistantSafetyResult.severity,
      flaggedPatterns: assistantSafetyResult.flaggedPatterns,
    });
    if (
      deps.hasActiveResponseRef.current &&
      deps.webrtcDataChannelRef.current?.readyState === 'open'
    ) {
      deps.webrtcDataChannelRef.current.send(JSON.stringify({ type: 'response.cancel' }));
      deps.hasActiveResponseRef.current = false;
    }
    deps.webrtcAudioElementRef.current?.pause();
    deps.audioQueueRef.current.clear();
    deps.isPlayingRef.current = false;
    deps.isBufferingRef.current = true;
    deps.scheduledSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
    });
    deps.scheduledSourcesRef.current.clear();
    deps.setSpeaking(false);
    triggerSafetyIntervention({
      sessionId: deps.sessionIdRef.current || 'unknown',
      safetyResult: {
        severity: assistantSafetyResult.severity,
        flaggedPatterns: assistantSafetyResult.flaggedPatterns,
        actionTaken: 'escalate',
        checkDurationMs: assistantSafetyResult.checkDurationMs,
      },
      dataChannel: deps.webrtcDataChannelRef.current,
      setWarningState: deps.setSafetyWarning,
      maestroId: deps.maestroRef.current?.id,
    });
    return true;
  }
  if (assistantSafetyResult.actionTaken === 'sanitize') {
    logger.warn('[VoiceSession] Assistant transcript flagged but allowed', {
      sessionId: deps.sessionIdRef.current,
      severity: assistantSafetyResult.severity,
      flaggedPatterns: assistantSafetyResult.flaggedPatterns,
    });
  }
  deps.addTranscript('assistant', event.transcript);
  deps.options.onTranscript?.('assistant', event.transcript);
  return true;
}
