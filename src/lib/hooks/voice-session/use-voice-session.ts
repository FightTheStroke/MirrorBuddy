// ============================================================================
// MIRRORBUDDY - VOICE SESSION HOOK (MODULAR)
// Azure OpenAI Realtime API with proper audio handling
// ============================================================================

'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { useVoiceSessionStore, useSettingsStore } from '@/lib/stores';
import type { Maestro } from '@/types';
import type { UseVoiceSessionOptions, ConnectionInfo } from './types';
import { useInitPlaybackContext, useScheduleQueuedChunks, usePlayNextChunk } from './audio-playback';
import { useStartAudioCapture } from './audio-capture';
import { useSendGreeting, useSendSessionConfig } from './session-config';
import { useHandleServerEvent } from './event-handlers';
import { useConnect, useDisconnect } from './connection';
import { useToggleMute, useSendText, useCancelResponse, useSendWebcamResult } from './actions';

export function useVoiceSession(options: UseVoiceSessionOptions = {}) {
  const {
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    currentMaestro,
    transcript,
    toolCalls,
    inputLevel,
    outputLevel,
    setConnected,
    setListening,
    setSpeaking,
    setMuted,
    setCurrentMaestro,
    addTranscript,
    clearTranscript,
    addToolCall,
    updateToolCall,
    clearToolCalls,
    setInputLevel,
    setOutputLevel,
    reset,
  } = useVoiceSessionStore();

  const {
    preferredMicrophoneId,
    preferredOutputId,
    voiceBargeInEnabled,
  } = useSettingsStore();

  // ============================================================================
  // REFS
  // ============================================================================

  const wsRef = useRef<WebSocket | null>(null);
  const maestroRef = useRef<Maestro | null>(null);

  // Audio contexts
  const captureContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);

  // Capture nodes
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Playback state
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const lastLevelUpdateRef = useRef<number>(0);
  const playNextChunkRef = useRef<(() => void) | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isBufferingRef = useRef(true);

  // Session state
  const sessionReadyRef = useRef(false);
  const greetingSentRef = useRef(false);
  const hasActiveResponseRef = useRef(false);
  const handleServerEventRef = useRef<((event: Record<string, unknown>) => void) | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');

  // ============================================================================
  // AUDIO PLAYBACK
  // ============================================================================

  const initPlaybackContext = useInitPlaybackContext(playbackContextRef, preferredOutputId);

  const audioPlaybackRefs = {
    playbackContextRef,
    audioQueueRef,
    isPlayingRef,
    isBufferingRef,
    nextPlayTimeRef,
    scheduledSourcesRef,
    playNextChunkRef,
  };

  const scheduleQueuedChunks = useScheduleQueuedChunks(audioPlaybackRefs, setSpeaking, setOutputLevel);
  const playNextChunk = usePlayNextChunk(audioPlaybackRefs, scheduleQueuedChunks, setSpeaking, setOutputLevel);

  // Keep ref updated with latest playNextChunk
  useEffect(() => {
    playNextChunkRef.current = playNextChunk;
  }, [playNextChunk]);

  // ============================================================================
  // AUDIO CAPTURE
  // ============================================================================

  const audioCaptureRefs = {
    captureContextRef,
    mediaStreamRef,
    sourceNodeRef,
    processorRef,
    analyserRef,
    lastLevelUpdateRef,
  };

  const startAudioCapture = useStartAudioCapture(
    audioCaptureRefs,
    wsRef,
    hasActiveResponseRef,
    isMuted,
    setInputLevel
  );

  // ============================================================================
  // SESSION CONFIGURATION
  // ============================================================================

  const sendGreeting = useSendGreeting(wsRef, greetingSentRef);
  const sendSessionConfig = useSendSessionConfig(
    maestroRef,
    wsRef,
    setConnected,
    setCurrentMaestro,
    setConnectionState,
    options
  );

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const eventHandlerDeps = {
    maestroRef,
    sessionIdRef,
    wsRef,
    hasActiveResponseRef,
    sessionReadyRef,
    audioQueueRef,
    isPlayingRef,
    isBufferingRef,
    scheduledSourcesRef,
    playbackContextRef,
    addTranscript,
    addToolCall,
    updateToolCall,
    setListening,
    setSpeaking,
    isSpeaking,
    voiceBargeInEnabled,
    options,
    sendSessionConfig,
    sendGreeting,
    initPlaybackContext,
    startAudioCapture,
    playNextChunk,
    scheduleQueuedChunks,
  };

  const handleServerEvent = useHandleServerEvent(eventHandlerDeps);

  // Keep ref updated with latest handleServerEvent
  useEffect(() => {
    handleServerEventRef.current = handleServerEvent;
  }, [handleServerEvent]);

  // ============================================================================
  // CONNECTION
  // ============================================================================

  const connectionRefs = {
    wsRef,
    maestroRef,
    captureContextRef,
    playbackContextRef,
    mediaStreamRef,
    sourceNodeRef,
    processorRef,
    audioQueueRef,
    isPlayingRef,
    isBufferingRef,
    nextPlayTimeRef,
    scheduledSourcesRef,
    sessionReadyRef,
    greetingSentRef,
    hasActiveResponseRef,
    handleServerEventRef,
    sessionIdRef,
  };

  const connect = useConnect(
    connectionRefs,
    setConnected,
    setConnectionState,
    connectionState,
    handleServerEvent,
    preferredMicrophoneId,
    initPlaybackContext,
    options
  );

  const disconnect = useDisconnect(connectionRefs, reset, setConnectionState);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const actionRefs = {
    wsRef,
    hasActiveResponseRef,
    audioQueueRef,
    isPlayingRef,
    isBufferingRef,
    scheduledSourcesRef,
  };

  const toggleMute = useToggleMute(isMuted, setMuted);
  const sendText = useSendText(wsRef, addTranscript);
  const cancelResponse = useCancelResponse(actionRefs, setSpeaking);
  const sendWebcamResult = useSendWebcamResult(wsRef);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    currentMaestro,
    transcript,
    toolCalls,
    inputLevel,
    outputLevel,
    connectionState,
    get inputAnalyser() {
      return analyserRef.current;
    },
    get sessionId() {
      return sessionIdRef.current;
    },
    connect,
    disconnect,
    toggleMute,
    sendText,
    cancelResponse,
    clearTranscript,
    clearToolCalls,
    sendWebcamResult,
  };
}
