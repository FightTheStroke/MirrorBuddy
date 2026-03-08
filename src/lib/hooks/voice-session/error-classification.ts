/**
 * Voice error classification helpers.
 * Used to avoid duplicate/noisy Sentry errors for expected capability failures.
 */

const CAPABILITY_ERROR_NAMES = new Set([
  'NotSupportedError',
  'NotAllowedError',
  'NotFoundError',
  'OverconstrainedError',
  'SecurityError',
]);

const CAPABILITY_MESSAGE_HINTS = [
  'notsupportederror',
  'not supported',
  'webrtc non supportato',
  'webrtc not supported',
  'microfono non autorizzato',
  'permission denied',
];

export function getVoiceErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function isVoiceRootCauseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return Boolean((error as Error & { _voiceRootCause?: boolean })._voiceRootCause);
}

export function isVoiceCapabilityError(error: unknown): boolean {
  if (error instanceof DOMException && CAPABILITY_ERROR_NAMES.has(error.name)) {
    return true;
  }

  if (error instanceof Error && CAPABILITY_ERROR_NAMES.has(error.name)) {
    return true;
  }

  const message = getVoiceErrorMessage(error).toLowerCase();
  return CAPABILITY_MESSAGE_HINTS.some((hint) => message.includes(hint));
}

export function shouldEscalateVoiceError(error: unknown): boolean {
  return !isVoiceRootCauseError(error) && !isVoiceCapabilityError(error);
}
