// ============================================================================
// VOICE SESSION BARREL EXPORT
// Main exports for backward compatibility
// ============================================================================

export { useVoiceSession } from './use-voice-session';
export { useUnifiedCamera } from './use-unified-camera';
export type { UnifiedCameraState } from './use-unified-camera';
export {
  isWebRTCSupported,
  hasRTCPeerConnection,
  hasGetUserMedia,
  getWebRTCSupportReport,
} from './webrtc-detection';
export { probeTransports } from './transport-probe';
export type { UseVoiceSessionOptions, ConnectionInfo, ConversationMemory } from './types';
export type { ProbeResult, ProbeResults } from './transport-probe';
export { triggerSafetyIntervention } from './safety-intervention';
export type { SafetyWarningState, SafetyInterventionParams } from './safety-intervention';
export { checkUserTranscript, checkAssistantTranscript } from './transcript-safety';
export type { TranscriptSafetyResult, AssistantTranscriptSafetyResult } from './transcript-safety';
