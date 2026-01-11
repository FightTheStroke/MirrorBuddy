// ============================================================================
// WebRTC Types
// Type definitions for WebRTC connection management
// ============================================================================

import type { Maestro } from '@/types';
import type { ConnectionInfo } from './types';

/**
 * Configuration for WebRTC connection
 */
export interface WebRTCConnectionConfig {
  maestro: Maestro;
  connectionInfo: ConnectionInfo;
  preferredMicrophoneId?: string;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onICEConnectionStateChange?: (state: RTCIceConnectionState) => void;
  onTrack?: (event: RTCTrackEvent) => void;
  onError?: (error: Error) => void;
  onDataChannelMessage?: (event: Record<string, unknown>) => void;
  onDataChannelOpen?: () => void;
  onDataChannelClose?: () => void;
}

/**
 * Result of successful WebRTC connection
 */
export interface WebRTCConnectionResult {
  peerConnection: RTCPeerConnection;
  mediaStream: MediaStream;
  dataChannel: RTCDataChannel | null;
  cleanup: () => void;
}

/**
 * Response from ephemeral token endpoint
 */
export interface EphemeralTokenResponse {
  token: string;
  expiresAt: string;
}

/**
 * Azure SDP exchange response
 */
export interface AzureSDPResponse {
  sdp: string;
  type: 'answer';
}

/**
 * ICE servers for WebRTC connection
 */
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];
