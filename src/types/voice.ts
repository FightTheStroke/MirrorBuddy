// ============================================================================
// VOICE SESSION TYPES
// ============================================================================

import type { Maestro } from './content';

export type VoiceSessionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

export type VoiceConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

/**
 * Handle returned by useVoiceSession hook.
 * Used to pass voice session state between components without re-creating connections.
 */
export interface VoiceSessionHandle {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  connectionState: VoiceConnectionState;
  connect: (maestro: Maestro, connectionInfo: { provider: 'azure'; proxyPort?: number }) => Promise<void>;
  disconnect: () => void;
  toggleMute: () => void;
}

export type EmotionType =
  | 'neutral'
  | 'joy'
  | 'excitement'
  | 'curiosity'
  | 'confusion'
  | 'frustration'
  | 'anxiety'
  | 'boredom'
  | 'distraction';

export interface Emotion {
  type: EmotionType;
  confidence: number;
  color: string;
}

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  emotion?: Emotion;
}

export interface AudioLevels {
  input: number;
  output: number;
}
