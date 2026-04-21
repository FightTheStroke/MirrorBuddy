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
 * Unified camera mode for voice sessions (ADR 0126).
 * - 'off': Camera disabled
 * - 'video': Continuous frame capture as passive context (no AI response triggered)
 * - 'photo': Single snapshot mode (AI responds to what it sees)
 */
export type CameraMode = 'off' | 'video' | 'photo';

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
  connect: (
    maestro: Maestro,
    connectionInfo: { provider: 'azure'; proxyPort?: number },
  ) => Promise<void>;
  disconnect: () => void;
  toggleMute: () => void;
  /** Whether video vision capture is active (ADR 0122) */
  videoEnabled: boolean;
  /** Toggle video vision capture on/off */
  toggleVideo: () => Promise<void>;
  /** Active camera stream for video preview (null when inactive) */
  videoStream: MediaStream | null;
  /** Number of video frames sent during current session */
  videoFramesSent: number;
  /** Elapsed seconds since video capture started */
  videoElapsedSeconds: number;
  /** Maximum allowed seconds for this capture session */
  videoMaxSeconds: number;
  /** Whether the user has reached their video vision limit */
  videoLimitReached: boolean;
  /** Current unified camera mode (ADR 0126) */
  cameraMode: CameraMode;
  /** Cycle through camera modes: off → video → photo → off */
  cycleCameraMode: () => Promise<void>;
  /** Take a single snapshot (photo mode) - AI will respond to what it sees */
  takeSnapshot: () => Promise<void>;
  /** Switch camera between front and back (mobile) */
  toggleCameraFacing: () => void;
  /** Current camera facing mode */
  cameraFacing: 'user' | 'environment';
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

/**
 * Response from Azure ephemeral token endpoint (PREVIEW format - deprecated)
 * @deprecated Use RealtimeTokenResponse for GA contract
 */
export interface EphemeralTokenResponse {
  /** Ephemeral token value (ek_...) */
  token: string;
  /** Token expiration timestamp (Unix seconds) */
  expiresAt: number;
  /** Provider (always 'azure' for now) */
  provider: 'azure';
}

/**
 * Azure session response (internal - PREVIEW format)
 * @deprecated Use RealtimeTokenResponse for GA contract
 */
export interface AzureRealtimeSessionResponse {
  object: string;
  id: string;
  model: string;
  client_secret: {
    value: string;
    expires_at: number;
  };
  // ... other fields optional
}

// ============================================================================
// GA CONTRACT TYPES (Azure Realtime API GA - effective 30 April 2026)
// See: mirrorbuddy-voice-architecture-audit-2026-02-14.md
// ============================================================================

/**
 * Client secret value from Azure Realtime API (GA format)
 * Used for ephemeral authentication with WebRTC/WebSocket
 */
export interface ClientSecretValue {
  /** Ephemeral token value (ek_...) */
  value: string;
  /** Token expiration timestamp (Unix seconds) - GA field name */
  expires_at_unix: number;
}

/**
 * Token response from /openai/v1/realtime/client_secrets (GA)
 * Replaces Preview /openai/realtimeapi/sessions endpoint
 */
export interface RealtimeTokenResponse {
  /** Client secret for ephemeral authentication */
  client_secret: ClientSecretValue;
  /** Session ID */
  id: string;
  /** Object type (e.g., 'realtime.session') */
  object?: string;
  /** Model deployment name */
  model?: string;
  /** Expiration timestamp (Unix seconds) - top-level field */
  expires_at?: number;
}

/**
 * Realtime API endpoint URLs (supports both Preview and GA)
 */
export interface RealtimeEndpoint {
  /** URL for creating client secrets (ephemeral tokens) */
  clientSecretsUrl: string;
  /** URL for WebRTC SDP exchange (/v1/realtime/calls in GA) */
  webrtcCallsUrl: string;
  /** WebSocket URL for data channel fallback */
  websocketUrl: string;
}

/**
 * Voice option for realtime sessions
 */
export type RealtimeVoice =
  | 'alloy'
  | 'echo'
  | 'shimmer'
  | 'ash'
  | 'ballad'
  | 'coral'
  | 'sage'
  | 'verse'
  | 'marin';

/**
 * Audio format for input/output
 */
export type AudioFormat = 'pcm16' | 'g711_ulaw' | 'g711_alaw';

/**
 * Modality types for session
 */
export type Modality = 'text' | 'audio';

/**
 * Turn detection configuration
 */
export interface TurnDetectionConfig {
  /** Type of turn detection */
  type: 'server_vad';
  /** Activation threshold (0.0-1.0) */
  threshold?: number;
  /** Prefix padding in milliseconds */
  prefix_padding_ms?: number;
  /** Silence duration in milliseconds */
  silence_duration_ms?: number;
}

/**
 * Input audio transcription configuration
 */
export interface InputAudioTranscription {
  /** Transcription model (e.g., 'whisper-1') */
  model: string;
}

/**
 * Tool choice option
 */
export type ToolChoice = 'auto' | 'none' | 'required' | { type: 'function'; name: string };

/**
 * Session configuration for GA client_secrets request
 * In GA, this is sent WITH the token request, not as a separate session.update
 */
export interface SessionConfig {
  /** Model deployment name (required) */
  model: string;
  /** Voice option (required) */
  voice: RealtimeVoice;
  /** System instructions for the model */
  instructions?: string;
  /** Modalities (text, audio) */
  modalities?: Modality[];
  /** Input audio format (for WebSocket data channel, not WebRTC media tracks) */
  input_audio_format?: AudioFormat;
  /** Output audio format (for WebSocket data channel, not WebRTC media tracks) */
  output_audio_format?: AudioFormat;
  /** Input audio transcription config */
  input_audio_transcription?: InputAudioTranscription;
  /** Turn detection (VAD) configuration */
  turn_detection?: TurnDetectionConfig;
  /** Available tools */
  tools?: unknown[];
  /** Tool choice strategy */
  tool_choice?: ToolChoice;
  /** Temperature for response generation (0.0-1.0) */
  temperature?: number;
  /** Maximum response output tokens */
  max_response_output_tokens?: number | 'inf';
}
