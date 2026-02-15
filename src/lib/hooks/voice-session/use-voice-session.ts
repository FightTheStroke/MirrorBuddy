// ============================================================================
// MIRRORBUDDY - VOICE SESSION HOOK (MODULAR)
// Azure OpenAI Realtime API via WebRTC
// ============================================================================

'use client';

import { useEffect } from 'react';
import { useVoiceSessionStore, useSettingsStore } from '@/lib/stores';
import type { UseVoiceSessionOptions } from './types';
import {
  useInitPlaybackContext,
  useScheduleQueuedChunks,
  usePlayNextChunk,
  useOutputLevelPolling,
} from './audio-playback';
import { useStartAudioCapture } from './audio-capture';
import { useSendGreeting, useSendSessionConfig } from './session-config';
import { useHandleServerEvent } from './event-handlers';
import { useConnect, useDisconnect } from './connection';
import { useSwitchCharacter } from './switch-character';
import { useToggleMute, useSendText, useCancelResponse, useSendWebcamResult } from './actions';
import { useUnifiedCamera } from './use-unified-camera';
import { useVoiceSessionRefs, useConnectionState } from './use-voice-session-refs';
import { useTokenCache } from './token-cache';

export function useVoiceSession(options: UseVoiceSessionOptions = {}) {
  const store = useVoiceSessionStore();
  const { preferredMicrophoneId, preferredOutputId, voiceBargeInEnabled, appearance } =
    useSettingsStore();

  // Token cache for reducing connection latency
  const { getCachedToken, preloadToken } = useTokenCache();

  // All refs extracted to separate file for line count management
  const refs = useVoiceSessionRefs();
  const [connectionState, setConnectionState] = useConnectionState();

  // Preload token on mount to have it ready for voice connections
  useEffect(() => {
    preloadToken();
  }, [preloadToken]);

  // ============================================================================
  // AUDIO PLAYBACK
  // ============================================================================

  const initPlaybackContext = useInitPlaybackContext(
    refs.playbackContextRef,
    refs.playbackAnalyserRef,
    refs.gainNodeRef,
    preferredOutputId,
  );

  const audioPlaybackRefs = {
    playbackContextRef: refs.playbackContextRef,
    audioQueueRef: refs.audioQueueRef,
    isPlayingRef: refs.isPlayingRef,
    isBufferingRef: refs.isBufferingRef,
    nextPlayTimeRef: refs.nextPlayTimeRef,
    scheduledSourcesRef: refs.scheduledSourcesRef,
    playNextChunkRef: refs.playNextChunkRef,
    playbackAnalyserRef: refs.playbackAnalyserRef,
    gainNodeRef: refs.gainNodeRef,
  };

  const scheduleQueuedChunks = useScheduleQueuedChunks(
    audioPlaybackRefs,
    store.setSpeaking,
    store.setOutputLevel,
  );
  const playNextChunk = usePlayNextChunk(
    audioPlaybackRefs,
    scheduleQueuedChunks,
    store.setSpeaking,
    store.setOutputLevel,
  );
  const { startPolling, stopPolling } = useOutputLevelPolling(
    refs.playbackAnalyserRef,
    refs.isPlayingRef,
    store.setOutputLevel,
  );

  useEffect(() => {
    refs.playNextChunkRef.current = playNextChunk;
  }, [playNextChunk, refs]);

  useEffect(() => {
    if (store.isSpeaking) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [store.isSpeaking, startPolling, stopPolling]);

  // ============================================================================
  // AUDIO CAPTURE
  // ============================================================================

  const audioCaptureRefs = {
    captureContextRef: refs.captureContextRef,
    mediaStreamRef: refs.mediaStreamRef,
    sourceNodeRef: refs.sourceNodeRef,
    analyserRef: refs.analyserRef,
    animationFrameRef: refs.animationFrameRef,
    lastLevelUpdateRef: refs.lastLevelUpdateRef,
    frequencyDataRef: refs.frequencyDataRef,
  };

  const startAudioCapture = useStartAudioCapture(audioCaptureRefs, store.setInputLevel);

  // ============================================================================
  // SESSION & EVENTS
  // ============================================================================

  const sendGreeting = useSendGreeting(
    refs.greetingSentRef,
    refs.webrtcDataChannelRef,
    appearance?.language,
  );
  const sendSessionConfig = useSendSessionConfig(
    refs.maestroRef,
    store.setConnected,
    store.setCurrentMaestro,
    setConnectionState,
    options,
    refs.webrtcDataChannelRef,
    refs.initialMessagesRef,
    refs.greetingSentRef,
  );

  // Store sendSessionConfig in ref so it can be called from connection.ts for WebRTC
  useEffect(() => {
    refs.sendSessionConfigRef.current = sendSessionConfig;
  }, [sendSessionConfig, refs]);

  const handleServerEvent = useHandleServerEvent({
    maestroRef: refs.maestroRef,
    sessionIdRef: refs.sessionIdRef,
    webrtcDataChannelRef: refs.webrtcDataChannelRef,
    hasActiveResponseRef: refs.hasActiveResponseRef,
    sessionReadyRef: refs.sessionReadyRef,
    audioQueueRef: refs.audioQueueRef,
    isPlayingRef: refs.isPlayingRef,
    isBufferingRef: refs.isBufferingRef,
    scheduledSourcesRef: refs.scheduledSourcesRef,
    playbackContextRef: refs.playbackContextRef,
    connectionTimeoutRef: refs.connectionTimeoutRef,
    greetingTimeoutsRef: refs.greetingTimeoutsRef,
    userSpeechEndTimeRef: refs.userSpeechEndTimeRef,
    firstAudioPlaybackTimeRef: refs.firstAudioPlaybackTimeRef,
    voiceConnectStartTimeRef: refs.voiceConnectStartTimeRef,
    voiceDataChannelOpenTimeRef: refs.voiceDataChannelOpenTimeRef,
    voiceSessionUpdatedTimeRef: refs.voiceSessionUpdatedTimeRef,
    addTranscript: store.addTranscript,
    addToolCall: store.addToolCall,
    updateToolCall: store.updateToolCall,
    setListening: store.setListening,
    setSpeaking: store.setSpeaking,
    isSpeaking: store.isSpeaking,
    voiceBargeInEnabled,
    options,
    sendSessionConfig,
    sendGreeting,
    unmuteAudioTracksRef: refs.unmuteAudioTracksRef,
    initPlaybackContext,
    startAudioCapture,
    playNextChunk,
    scheduleQueuedChunks,
  });

  useEffect(() => {
    refs.handleServerEventRef.current = handleServerEvent;
  }, [handleServerEvent, refs]);

  // ============================================================================
  // CONNECTION
  // ============================================================================

  const connectionRefs = {
    maestroRef: refs.maestroRef,
    captureContextRef: refs.captureContextRef,
    playbackContextRef: refs.playbackContextRef,
    mediaStreamRef: refs.mediaStreamRef,
    sourceNodeRef: refs.sourceNodeRef,
    processorRef: refs.processorRef,
    audioQueueRef: refs.audioQueueRef,
    isPlayingRef: refs.isPlayingRef,
    isBufferingRef: refs.isBufferingRef,
    nextPlayTimeRef: refs.nextPlayTimeRef,
    scheduledSourcesRef: refs.scheduledSourcesRef,
    sessionReadyRef: refs.sessionReadyRef,
    greetingSentRef: refs.greetingSentRef,
    hasActiveResponseRef: refs.hasActiveResponseRef,
    handleServerEventRef: refs.handleServerEventRef,
    sessionIdRef: refs.sessionIdRef,
    connectionTimeoutRef: refs.connectionTimeoutRef,
    greetingTimeoutsRef: refs.greetingTimeoutsRef,
    webrtcCleanupRef: refs.webrtcCleanupRef,
    remoteAudioStreamRef: refs.remoteAudioStreamRef,
    webrtcAudioElementRef: refs.webrtcAudioElementRef,
    webrtcDataChannelRef: refs.webrtcDataChannelRef,
    webrtcHeartbeatRef: refs.webrtcHeartbeatRef,
    animationFrameRef: refs.animationFrameRef,
    userSpeechEndTimeRef: refs.userSpeechEndTimeRef,
    firstAudioPlaybackTimeRef: refs.firstAudioPlaybackTimeRef,
    voiceConnectStartTimeRef: refs.voiceConnectStartTimeRef,
    voiceDataChannelOpenTimeRef: refs.voiceDataChannelOpenTimeRef,
    voiceSessionUpdatedTimeRef: refs.voiceSessionUpdatedTimeRef,
    sendSessionConfigRef: refs.sendSessionConfigRef,
    unmuteAudioTracksRef: refs.unmuteAudioTracksRef,
    initialMessagesRef: refs.initialMessagesRef,
  };

  const connect = useConnect(
    connectionRefs,
    store.setConnected,
    setConnectionState,
    connectionState,
    handleServerEvent,
    preferredMicrophoneId,
    initPlaybackContext,
    options,
    getCachedToken,
  );
  const disconnect = useDisconnect(connectionRefs, store.reset, setConnectionState);
  const switchCharacter = useSwitchCharacter({
    webrtcDataChannelRef: refs.webrtcDataChannelRef,
    maestroRef: refs.maestroRef,
    greetingSentRef: refs.greetingSentRef,
    sessionReadyRef: refs.sessionReadyRef,
    sendSessionConfigRef: refs.sendSessionConfigRef,
    switchCharacterStore: store.switchCharacter,
  });

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================================
  // ACTIONS & RETURN
  // ============================================================================

  const actionRefs = {
    hasActiveResponseRef: refs.hasActiveResponseRef,
    audioQueueRef: refs.audioQueueRef,
    isPlayingRef: refs.isPlayingRef,
    isBufferingRef: refs.isBufferingRef,
    scheduledSourcesRef: refs.scheduledSourcesRef,
    webrtcDataChannelRef: refs.webrtcDataChannelRef,
    webrtcAudioElementRef: refs.webrtcAudioElementRef,
  };

  // Unified camera (ADR 0126) - video + photo modes
  const unifiedCamera = useUnifiedCamera({
    webrtcDataChannelRef: refs.webrtcDataChannelRef,
    sessionIdRef: refs.sessionIdRef,
    videoUsageIdRef: refs.videoUsageIdRef,
    videoMaxSecondsRef: refs.videoMaxSecondsRef,
  });

  return {
    isConnected: store.isConnected,
    isListening: store.isListening,
    isSpeaking: store.isSpeaking,
    isMuted: store.isMuted,
    currentMaestro: store.currentMaestro,
    transcript: store.transcript,
    toolCalls: store.toolCalls,
    inputLevel: store.inputLevel,
    outputLevel: store.outputLevel,
    connectionState,
    get inputAnalyser() {
      return refs.analyserRef.current;
    },
    get outputAnalyser() {
      return refs.playbackAnalyserRef.current;
    },
    get sessionId() {
      return refs.sessionIdRef.current;
    },
    connect,
    disconnect,
    /** Switch character on active connection via session.update (no reconnect).
     *  Returns false if no connection — caller should use connect() instead.
     *  @see switch-character.ts */
    switchCharacter,
    toggleMute: useToggleMute(store.isMuted, store.setMuted),
    sendText: useSendText(refs.webrtcDataChannelRef, store.addTranscript),
    cancelResponse: useCancelResponse(actionRefs, store.setSpeaking),
    clearTranscript: store.clearTranscript,
    clearToolCalls: store.clearToolCalls,
    sendWebcamResult: useSendWebcamResult(refs.webrtcDataChannelRef),
    ...unifiedCamera,
  };
}
