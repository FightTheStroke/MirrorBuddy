/**
 * @file types.ts
 * @brief Unified types for character components (Maestri, Coach, Buddy)
 */

export type CharacterType = 'maestro' | 'coach' | 'buddy';

/**
 * Unified character interface that works for all character types
 */
export interface UnifiedCharacter {
  id: string;
  name: string;
  type: CharacterType;
  specialty: string;
  greeting: string;
  avatar: string;
  color: string; // Always hex color (normalized)
  badge: string; // "Professore" | "Coach" | "Amico"
}

/**
 * Voice connection state
 */
export interface VoiceState {
  isActive: boolean;
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  inputLevel: number;
  outputLevel: number;
  connectionState: string;
  configError: string | null;
}

/**
 * Header and voice panel action callbacks
 */
export interface HeaderActions {
  onVoiceCall: () => void;
  onStopTTS: () => void;
  onClearChat: () => void;
  onClose: () => void;
  onToggleMute?: () => void;
}
