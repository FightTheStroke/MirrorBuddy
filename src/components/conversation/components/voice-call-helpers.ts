import type { ActiveCharacter } from '@/lib/stores/conversation-flow-store';
import type { Maestro, MaestroVoice, Subject } from '@/types';
import { CHARACTER_AVATARS } from './constants';

// Get userId from cookie or sessionStorage
export function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  const cookieMatch = document.cookie.match(/mirrorbuddy-user-id=([^;]+)/);
  if (cookieMatch) return cookieMatch[1];
  return sessionStorage.getItem('mirrorbuddy-user-id');
}

// Convert ActiveCharacter to Maestro-compatible interface
export function activeCharacterToMaestro(character: ActiveCharacter): Maestro {
  return {
    id: character.id,
    name: character.name,
    subject: 'methodology' as Subject,
    specialty: character.type === 'coach' ? 'Metodo di studio' : 'Supporto emotivo',
    voice: (character.voice || 'alloy') as MaestroVoice,
    voiceInstructions: character.voiceInstructions || '',
    teachingStyle: character.type === 'coach' ? 'scaffolding' : 'peer-support',
    avatar: CHARACTER_AVATARS[character.id] || '/avatars/default.jpg',
    color: character.color,
    systemPrompt: character.systemPrompt,
    greeting: character.greeting,
  };
}
