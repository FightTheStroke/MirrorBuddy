// ============================================================================
// VOICE SESSION TYPES
// TypeScript interfaces and types for voice session hook
// ============================================================================

export interface UseVoiceSessionOptions {
  onTranscript?: (role: 'user' | 'assistant', text: string) => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: 'idle' | 'connecting' | 'connected' | 'error') => void;
  onWebcamRequest?: (request: { purpose: string; instructions?: string; callId: string }) => void;
  /** Disable barge-in to prevent echo loop (speaker→mic→VAD→cancel) */
  disableBargeIn?: boolean;
  /** Noise reduction type: 'near_field' for headphones, 'far_field' for laptop speakers with echo */
  noiseReductionType?: 'near_field' | 'far_field';
}

export interface ConnectionInfo {
  provider: 'azure' | 'openai';
  proxyPort?: number;
  configured?: boolean;
  wsUrl?: string;
  token?: string;
  characterType?: 'maestro' | 'coach' | 'buddy';
  /** Previous messages to inject into voice session for context continuity */
  initialMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Azure resource name for GA protocol (from /api/realtime/token) */
  azureResource?: string;
  /** WebRTC endpoint URL for preview protocol (from /api/realtime/token) */
  webrtcEndpoint?: string;
  /** Azure deployment name (from /api/realtime/token) */
  deployment?: string;
  /** Transport mode: webrtc or websocket */
  transport?: 'webrtc' | 'websocket';
}

export interface ConversationMemory {
  summary?: string;
  keyFacts?: {
    decisions?: string[];
    preferences?: string[];
    learned?: string[];
  };
  recentTopics?: string[];
}
