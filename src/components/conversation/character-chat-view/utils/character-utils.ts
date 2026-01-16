/**
 * @file character-utils.ts
 * @brief Utility functions for character chat view
 */

import { getSupportTeacherById } from '@/data/support-teachers';
import { getBuddyById } from '@/data/buddy-profiles';
import type {
  ExtendedStudentProfile,
  Maestro,
  Subject,
  MaestroVoice,
} from '@/types';

const CHARACTER_AVATARS: Record<string, string> = {
  mario: '/avatars/mario.jpg',
  noemi: '/avatars/noemi.webp',
  enea: '/avatars/enea.webp',
  bruno: '/avatars/bruno.webp',
  sofia: '/avatars/sofia.webp',
  melissa: '/avatars/melissa.jpg',
  roberto: '/avatars/roberto.webp',
  chiara: '/avatars/chiara.webp',
  andrea: '/avatars/andrea.webp',
  favij: '/avatars/favij.jpg',
};

const DEFAULT_STUDENT_PROFILE: ExtendedStudentProfile = {
  name: 'Studente',
  age: 14,
  schoolYear: 2,
  schoolLevel: 'media',
  fontSize: 'medium',
  highContrast: false,
  dyslexiaFont: false,
  voiceEnabled: true,
  simplifiedLanguage: false,
  adhdMode: false,
  learningDifferences: [],
};

export interface CharacterInfo {
  name: string;
  role: string;
  description: string;
  greeting: string;
  avatar: string;
  color: string;
  systemPrompt: string;
  voice: string;
  voiceInstructions: string;
  themeColor: string;
}

export function getCharacterInfo(
  characterId: string,
  characterType: 'coach' | 'buddy'
): CharacterInfo {
  if (characterType === 'coach') {
    const teacher = getSupportTeacherById(
      characterId as
        | 'melissa'
        | 'roberto'
        | 'chiara'
        | 'andrea'
        | 'favij'
    );
    return {
      name: teacher?.name || characterId,
      role: 'Coach di Apprendimento',
      description: teacher?.personality || '',
      greeting: teacher?.greeting || `Ciao! Sono il tuo coach.`,
      avatar: CHARACTER_AVATARS[characterId] || '',
      color: 'from-purple-500 to-indigo-600',
      systemPrompt: teacher?.systemPrompt || '',
      voice: teacher?.voice || 'shimmer',
      voiceInstructions: teacher?.voiceInstructions || '',
      themeColor: teacher?.color || '#EC4899',
    };
  } else {
    const buddy = getBuddyById(
      characterId as 'mario' | 'noemi' | 'enea' | 'bruno' | 'sofia'
    );
    const greeting =
      buddy?.getGreeting?.(DEFAULT_STUDENT_PROFILE) ||
      `Ehi! Piacere di conoscerti!`;
    const systemPrompt =
      buddy?.getSystemPrompt?.(DEFAULT_STUDENT_PROFILE) || '';
    return {
      name: buddy?.name || characterId,
      role: 'Amico di Studio',
      description: buddy?.personality || '',
      greeting,
      avatar: CHARACTER_AVATARS[characterId] || '',
      color: 'from-pink-500 to-rose-600',
      systemPrompt,
      voice: buddy?.voice || 'ash',
      voiceInstructions: buddy?.voiceInstructions || '',
      themeColor: buddy?.color || '#10B981',
    };
  }
}

export function characterToMaestro(
  character: CharacterInfo,
  characterId: string
): Maestro {
  return {
    id: characterId,
    name: character.name,
    subject: 'italian' as Subject, // Default subject for coaches/buddies
    specialty: character.role,
    voice: character.voice as MaestroVoice,
    voiceInstructions: character.voiceInstructions,
    teachingStyle: character.description,
    avatar: character.avatar,
    color: character.themeColor,
    systemPrompt: character.systemPrompt,
    greeting: character.greeting,
  };
}

