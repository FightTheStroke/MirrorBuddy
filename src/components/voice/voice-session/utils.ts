import { XP_PER_LEVEL } from '@/lib/constants/xp-rewards';

export function calculateXpProgress(xp: number, level: number): number {
  const currentLevelXP = XP_PER_LEVEL[level - 1] || 0;
  const nextLevelXP = XP_PER_LEVEL[level] || XP_PER_LEVEL[XP_PER_LEVEL.length - 1];
  return nextLevelXP > currentLevelXP ? ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100 : 100;
}

export function getStateText(
  configError: any,
  permissionsLoading: boolean,
  connectionState: string,
  isListening: boolean,
  isSpeaking: boolean,
  isConnected: boolean,
  maestroName: string
): string {
  if (configError) return 'Errore di configurazione';
  if (permissionsLoading) return 'Controllo permessi...';
  if (connectionState === 'connecting') return 'Connessione in corso...';
  if (isListening) return 'Ti sto ascoltando...';
  if (isSpeaking) return `${maestroName} sta parlando...`;
  if (isConnected) return 'Pronto - parla ora';
  return 'Disconnesso';
}

export function calculateSessionXP(currentSession: any, transcriptLength: number): number {
  return currentSession?.xpEarned || Math.max(5, transcriptLength * 2);
}
