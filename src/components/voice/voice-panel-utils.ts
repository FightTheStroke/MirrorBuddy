// Utility functions for voice panel styling and logic

export function isHexColor(color: string): boolean {
  return color.startsWith('#');
}

export function getContrastColor(bgColor: string): string {
  if (bgColor.includes('light') || bgColor.includes('yellow') || bgColor.includes('lime')) {
    return 'text-slate-900';
  }
  return 'text-white';
}

export interface AuraIntensityConfig {
  isConnected: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  isMuted: boolean;
  inputLevel: number;
  outputLevel: number;
}

export function calculateAuraIntensity({
  isConnected,
  isSpeaking,
  isListening,
  isMuted,
  inputLevel,
  outputLevel,
}: AuraIntensityConfig): number {
  if (!isConnected) return 0;
  if (isSpeaking) return outputLevel;
  if (isListening && !isMuted) return inputLevel;
  return 0.1;
}
