/**
 * @file character-adapter.ts
 * @brief Adapters to convert Maestro/CharacterInfo to UnifiedCharacter
 */

import type { Maestro } from '@/types';
import type { CharacterInfo } from '@/components/conversation/character-chat-view/utils/character-utils';
import type { UnifiedCharacter, CharacterType } from '../types';
import { normalizeToHex } from './gradient-utils';

const TYPE_BADGES: Record<CharacterType, string> = {
  maestro: 'Professore',
  coach: 'Coach',
  buddy: 'Amico',
};

/**
 * Convert Maestro to UnifiedCharacter
 */
export function maestroToUnified(maestro: Maestro): UnifiedCharacter {
  return {
    id: maestro.id,
    name: maestro.name,
    type: 'maestro',
    specialty: maestro.specialty,
    greeting: maestro.greeting,
    avatar: maestro.avatar,
    color: maestro.color,
    badge: TYPE_BADGES.maestro,
  };
}

/**
 * Convert CharacterInfo (coach/buddy) to UnifiedCharacter
 */
export function characterInfoToUnified(
  info: CharacterInfo,
  characterId: string,
  characterType: 'coach' | 'buddy'
): UnifiedCharacter {
  return {
    id: characterId,
    name: info.name,
    type: characterType,
    specialty: info.role,
    greeting: info.greeting,
    avatar: info.avatar,
    color: normalizeToHex(info.themeColor || info.color),
    badge: TYPE_BADGES[characterType],
  };
}
