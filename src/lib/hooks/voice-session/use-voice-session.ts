// ============================================================================
// MIRRORBUDDY - VOICE SESSION HOOK (MODULAR)
// Azure OpenAI Realtime API with proper audio handling
// ============================================================================

'use client';

import { useEffect } from 'react';
import { useVoiceSessionStore, useSettingsStore } from '@/lib/stores';
import type { UseVoiceSessionOptions } from './types';
import { useInitPlaybackContext, useScheduleQueuedChunks, usePlayNextChunk, useOutputLevelPolling } from './audio-playback';
import { useStartAudioCapture } from './audio-capture';
import { useSendGreeting, useSendSessionConfig } from './session-config';
import { useHandleServerEvent } from './event-handlers';
import { useConnect, useDisconnect } from './connection';
import { useToggleMute, useSendText, useCancelResponse, useSendWebcamResult } from './actions';
import { useVoiceSessionRefs, useConnectionState } from './use-voice-session-refs';

export function useVoiceSession(options: UseVoiceSessionOptions = {}) {
  const store = useVoiceSessionStore();
  const { preferredMicrophoneId, preferredOutputId, voiceBargeInEnabled } = useSettingsStore();

  // All refs extracted to separate file for line count management
  const refs = useVoiceSessionRefs();
  const [connectionState, setConnectionState] = useConnectionState();

  // ============================================================================
  // AUDIO PLAYBACK
  // ============================================================================

  const initPlaybackContext = useInitPlaybackContext(
    refs.playbackContextRef,
    refs.playbackAnalyserRef,
    refs.gainNodeRef,
    preferredOutputId
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

  const scheduleQueuedChunks = useScheduleQueuedChunks(audioPlaybackRefs, store.setSpeaking, store.setOutputLevel);
  const playNextChunk = usePlayNextChunk(audioPlaybackRefs, scheduleQueuedChunks, store.setSpeaking, store.setOutputLevel);
  const { startPolling, stopPolling } = useOutputLevelPolling(refs.playbackAnalyserRef, refs.isPlayingRef, store.setOutputLevel);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- refs are stable
  useEffect(() => { refs.playNextChunkRef.current = playNextChunk; }, [playNextChunk]);
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- intentional ternary
  useEffect(() => { store.isSpeaking ? startPolling() : stopPolling(); }, [store.isSpeaking, startPolling, stopPolling]);

  // ============================================================================
  // AUDIO CAPTURE
  // ============================================================================

  const audioCaptureRefs = {
    captureContextRef: refs.captureContextRef,
    mediaStreamRef: refs.mediaStreamRef,
    sourceNodeRef: refs.sourceNodeRef,
    processorRef: refs.processorRef,
    analyserRef: refs.analyserRef,
    lastLevelUpdateRef: refs.lastLevelUpdateRef,
  };

  const startAudioCapture = useStartAudioCapture(
    audioCaptureRefs, refs.wsRef, refs.transportRef, refs.hasActiveResponseRef, store.isMuted, store.setInputLevel
  );

  // ============================================================================
  // SESSION & EVENTS
  // ============================================================================

  const sendGreeting = useSendGreeting(refs.wsRef, refs.greetingSentRef);
  const sendSessionConfig = useSendSessionConfig(
    refs.maestroRef,
    refs.wsRef,
    store.setConnected,
    store.setCurrentMaestro,
    setConnectionState,
    options,
    refs.transportRef,
    refs.webrtcDataChannelRef
  );

  // Store sendSessionConfig in ref so it can be called from connection.ts for WebRTC
  useEffect(() => { refs.sendSessionConfigRef.current = sendSessionConfig; }, [sendSessionConfig, refs]);

  const handleServerEvent = useHandleServerEvent({
    maestroRef: refs.maestroRef,
    sessionIdRef: refs.sessionIdRef,
    wsRef: refs.wsRef,
    transportRef: refs.transportRef,
    webrtcDataChannelRef: refs.webrtcDataChannelRef,
    hasActiveResponseRef: refs.hasActiveResponseRef,
    sessionReadyRef: refs.sessionReadyRef,
    audioQueueRef: refs.audioQueueRef,
    isPlayingRef: refs.isPlayingRef,
    isBufferingRef: refs.isBufferingRef,
    scheduledSourcesRef: refs.scheduledSourcesRef,
    playbackContextRef: refs.playbackContextRef,
    connectionTimeoutRef: refs.connectionTimeoutRef,
    userSpeechEndTimeRef: refs.userSpeechEndTimeRef,
    firstAudioPlaybackTimeRef: refs.firstAudioPlaybackTimeRef,
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
    initPlaybackContext,
    startAudioCapture,
    playNextChunk,
    scheduleQueuedChunks,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps -- refs are stable
  useEffect(() => { refs.handleServerEventRef.current = handleServerEvent; }, [handleServerEvent]);

  // ============================================================================
  // CONNECTION
  // ============================================================================

  const connectionRefs = {
    wsRef: refs.wsRef,
    maestroRef: refs.maestroRef,
    transportRef: refs.transportRef,
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
    webrtcCleanupRef: refs.webrtcCleanupRef,
    remoteAudioStreamRef: refs.remoteAudioStreamRef,
    webrtcAudioElementRef: refs.webrtcAudioElementRef,
    webrtcDataChannelRef: refs.webrtcDataChannelRef,
    userSpeechEndTimeRef: refs.userSpeechEndTimeRef,
    firstAudioPlaybackTimeRef: refs.firstAudioPlaybackTimeRef,
    sendSessionConfigRef: refs.sendSessionConfigRef,
  };

  const connect = useConnect(
    connectionRefs, store.setConnected, setConnectionState, connectionState,
    handleServerEvent, preferredMicrophoneId, initPlaybackContext, options
  );
  const disconnect = useDisconnect(connectionRefs, store.reset, setConnectionState);

  useEffect(() => { return () => { disconnect(); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================================
  // ACTIONS & RETURN
  // ============================================================================

  const actionRefs = {
    wsRef: refs.wsRef,
    hasActiveResponseRef: refs.hasActiveResponseRef,
    audioQueueRef: refs.audioQueueRef,
    isPlayingRef: refs.isPlayingRef,
    isBufferingRef: refs.isBufferingRef,
    scheduledSourcesRef: refs.scheduledSourcesRef,
    transportRef: refs.transportRef,
    webrtcDataChannelRef: refs.webrtcDataChannelRef,
    webrtcAudioElementRef: refs.webrtcAudioElementRef,
  };

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
    get inputAnalyser() { return refs.analyserRef.current; },
    get sessionId() { return refs.sessionIdRef.current; },
    connect,
    disconnect,
    toggleMute: useToggleMute(store.isMuted, store.setMuted),
    sendText: useSendText(refs.wsRef, refs.transportRef, refs.webrtcDataChannelRef, store.addTranscript),
    cancelResponse: useCancelResponse(actionRefs, store.setSpeaking),
    clearTranscript: store.clearTranscript,
    clearToolCalls: store.clearToolCalls,
    sendWebcamResult: useSendWebcamResult(refs.wsRef, refs.transportRef, refs.webrtcDataChannelRef),
  };
}
