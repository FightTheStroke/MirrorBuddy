/**
 * Stable, locale-independent voice error codes.
 *
 * The connection layer (webrtc-connection.ts, error-handler.ts) throws these
 * codes instead of human-readable strings so that the UI layer
 * (use-maestro-voice-connection.ts) can map each code to a localized,
 * child-friendly message via next-intl. A child must never read a raw
 * provider/technical error, and the same calm message must work in all 5
 * locales (BUG-04).
 */

export type VoiceErrorCode =
  | 'VOICE_TOKEN_UNAVAILABLE'
  | 'VOICE_SERVER_TIMEOUT'
  | 'VOICE_RATE_LIMITED'
  | 'VOICE_CONFIG_UNAVAILABLE'
  | 'MIC_UNAVAILABLE'
  | 'MIC_NOT_ALLOWED'
  | 'VOICE_CONNECTION_FAILED';

/**
 * Error carrying a stable {@link VoiceErrorCode}. `message` is set to the code
 * so existing logging/classification that reads `error.message` keeps working,
 * while `code` is the canonical field the UI maps from.
 */
export class VoiceError extends Error {
  readonly code: VoiceErrorCode;

  constructor(code: VoiceErrorCode) {
    super(code);
    this.name = 'VoiceError';
    this.code = code;
  }
}

/** Extract a VoiceErrorCode from an unknown error, or null if none present. */
export function getVoiceErrorCode(error: unknown): VoiceErrorCode | null {
  if (error instanceof VoiceError) return error.code;
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  ) {
    const code = (error as { code: string }).code;
    if (VOICE_ERROR_CODES.includes(code as VoiceErrorCode)) {
      return code as VoiceErrorCode;
    }
  }
  return null;
}

const VOICE_ERROR_CODES: VoiceErrorCode[] = [
  'VOICE_TOKEN_UNAVAILABLE',
  'VOICE_SERVER_TIMEOUT',
  'VOICE_RATE_LIMITED',
  'VOICE_CONFIG_UNAVAILABLE',
  'MIC_UNAVAILABLE',
  'MIC_NOT_ALLOWED',
  'VOICE_CONNECTION_FAILED',
];

/** Maps a VoiceErrorCode to its i18n key under the `voice` namespace. */
export const VOICE_ERROR_I18N_KEYS: Record<VoiceErrorCode, string> = {
  VOICE_TOKEN_UNAVAILABLE: 'errorTokenUnavailable',
  VOICE_SERVER_TIMEOUT: 'errorServerTimeout',
  VOICE_RATE_LIMITED: 'errorRateLimited',
  VOICE_CONFIG_UNAVAILABLE: 'errorConfigUnavailable',
  MIC_UNAVAILABLE: 'errorMicUnavailable',
  MIC_NOT_ALLOWED: 'errorMicNotAllowed',
  VOICE_CONNECTION_FAILED: 'errorConnectionFailed',
};
