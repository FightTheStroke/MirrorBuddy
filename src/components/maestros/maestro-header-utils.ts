/**
 * Utility functions for maestro session headers
 */

export function getStatusText(
  configError: string | null,
  isConnected: boolean,
  isSpeaking: boolean,
  isListening: boolean,
  maestroName: string
): string {
  if (configError) return configError;
  if (isConnected && isSpeaking) return `${maestroName} sta parlando...`;
  if (isConnected && isListening) return 'In ascolto...';
  if (isConnected) return 'Connesso';
  return 'Avvio chiamata...';
}

export function getMuteButtonLabel(isMuted: boolean): string {
  return isMuted ? 'Attiva microfono' : 'Disattiva microfono';
}

export function getMuteStatusText(isMuted: boolean): string {
  return isMuted ? 'Microfono disattivato' : 'Parla ora...';
}

export function getVoiceStatusIndicator(
  isSpeaking: boolean,
  isListening: boolean,
  isMuted: boolean,
  maestroName: string
): string {
  if (isSpeaking) return `${maestroName} sta parlando`;
  if (isListening && !isMuted) return 'In ascolto...';
  if (isMuted) return 'Microfono disattivato';
  return 'Connesso';
}
