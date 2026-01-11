// ============================================================================
// VOICE SESSION BARREL EXPORT
// Main exports for backward compatibility
// ============================================================================

export { useVoiceSession } from './use-voice-session';
export {
  isWebRTCSupported,
  hasRTCPeerConnection,
  hasGetUserMedia,
  getWebRTCSupportReport,
} from './webrtc-detection';
export type { UseVoiceSessionOptions, ConnectionInfo, ConversationMemory } from './types';
