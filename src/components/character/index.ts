/**
 * @file index.ts
 * @brief Barrel exports for unified character components
 */

// Types
export type {
  CharacterType,
  UnifiedCharacter,
  VoiceState,
  HeaderActions,
} from './types';

// Utils
export { normalizeToHex, createGradientStyle, createVerticalGradientStyle } from './utils/gradient-utils';
export { maestroToUnified, characterInfoToUnified } from './utils/character-adapter';

// Components
export { AuraRings } from './components/aura-rings';
export { CharacterHeader } from './components/character-header';
export { CharacterVoicePanel } from './components/character-voice-panel';
