// ============================================================================
// VOICE SESSION REFS - Extracted for file size management
// ============================================================================

'use client';

import { useRef, useState } from 'react';
import type { Maestro } from '@/types';

export interface VoiceSessionRefs {
  wsRef: React.MutableRefObject<WebSocket | null>;
  maestroRef: React.MutableRefObject<Maestro | null>;
  transportRef: React.MutableRefObject<'websocket' | 'webrtc'>;
  captureContextRef: React.MutableRefObject<AudioContext | null>;
  playbackContextRef: React.MutableRefObject<AudioContext | null>;
  mediaStreamRef: React.MutableRefObject<MediaStream | null>;
  sourceNodeRef: React.MutableRefObject<MediaStreamAudioSourceNode | null>;
  processorRef: React.MutableRefObject<ScriptProcessorNode | null>;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  audioQueueRef: React.MutableRefObject<Int16Array[]>;
  isPlayingRef: React.MutableRefObject<boolean>;
  lastLevelUpdateRef: React.MutableRefObject<number>;
  playNextChunkRef: React.MutableRefObject<(() => void) | null>;
  nextPlayTimeRef: React.MutableRefObject<number>;
  scheduledSourcesRef: React.MutableRefObject<AudioBufferSourceNode[]>;
  isBufferingRef: React.MutableRefObject<boolean>;
  playbackAnalyserRef: React.MutableRefObject<AnalyserNode | null>;
  gainNodeRef: React.MutableRefObject<GainNode | null>;
  sessionReadyRef: React.MutableRefObject<boolean>;
  greetingSentRef: React.MutableRefObject<boolean>;
  hasActiveResponseRef: React.MutableRefObject<boolean>;
  handleServerEventRef: React.MutableRefObject<((event: Record<string, unknown>) => void) | null>;
  sessionIdRef: React.MutableRefObject<string | null>;
  connectionTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  greetingTimeoutsRef: React.MutableRefObject<NodeJS.Timeout[]>;
  webrtcCleanupRef: React.MutableRefObject<(() => void) | null>;
  remoteAudioStreamRef: React.MutableRefObject<MediaStream | null>;
  webrtcAudioElementRef: React.MutableRefObject<HTMLAudioElement | null>;
  webrtcDataChannelRef: React.MutableRefObject<RTCDataChannel | null>;
  webrtcHeartbeatRef: React.MutableRefObject<NodeJS.Timeout | null>;
  userSpeechEndTimeRef: React.MutableRefObject<number | null>;
  firstAudioPlaybackTimeRef: React.MutableRefObject<number | null>;
  sendSessionConfigRef: React.MutableRefObject<(() => void) | null>;
  initialMessagesRef: React.MutableRefObject<Array<{ role: 'user' | 'assistant'; content: string }> | null>;
}

export function useVoiceSessionRefs(): VoiceSessionRefs {
  return {
    wsRef: useRef<WebSocket | null>(null),
    maestroRef: useRef<Maestro | null>(null),
    transportRef: useRef<'websocket' | 'webrtc'>('websocket'),
    captureContextRef: useRef<AudioContext | null>(null),
    playbackContextRef: useRef<AudioContext | null>(null),
    mediaStreamRef: useRef<MediaStream | null>(null),
    sourceNodeRef: useRef<MediaStreamAudioSourceNode | null>(null),
    processorRef: useRef<ScriptProcessorNode | null>(null),
    analyserRef: useRef<AnalyserNode | null>(null),
    audioQueueRef: useRef<Int16Array[]>([]),
    isPlayingRef: useRef(false),
    lastLevelUpdateRef: useRef<number>(0),
    playNextChunkRef: useRef<(() => void) | null>(null),
    nextPlayTimeRef: useRef<number>(0),
    scheduledSourcesRef: useRef<AudioBufferSourceNode[]>([]),
    isBufferingRef: useRef(true),
    playbackAnalyserRef: useRef<AnalyserNode | null>(null),
    gainNodeRef: useRef<GainNode | null>(null),
    sessionReadyRef: useRef(false),
    greetingSentRef: useRef(false),
    hasActiveResponseRef: useRef(false),
    handleServerEventRef: useRef<((event: Record<string, unknown>) => void) | null>(null),
    sessionIdRef: useRef<string | null>(null),
    connectionTimeoutRef: useRef<NodeJS.Timeout | null>(null),
    greetingTimeoutsRef: useRef<NodeJS.Timeout[]>([]),
    webrtcCleanupRef: useRef<(() => void) | null>(null),
    remoteAudioStreamRef: useRef<MediaStream | null>(null),
    webrtcAudioElementRef: useRef<HTMLAudioElement | null>(null),
    webrtcDataChannelRef: useRef<RTCDataChannel | null>(null),
    webrtcHeartbeatRef: useRef<NodeJS.Timeout | null>(null),
    userSpeechEndTimeRef: useRef<number | null>(null),
    firstAudioPlaybackTimeRef: useRef<number | null>(null),
    sendSessionConfigRef: useRef<(() => void) | null>(null),
    initialMessagesRef: useRef<Array<{ role: 'user' | 'assistant'; content: string }> | null>(null),
  };
}

export function useConnectionState() {
  return useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
}
