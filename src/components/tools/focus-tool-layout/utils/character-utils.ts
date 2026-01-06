/**
 * @file character-utils.ts
 * @brief Utility functions for character management in focus tool layout
 */

import { getMaestroById } from '@/data';
import { getSupportTeacherById, type CoachId } from '@/data/support-teachers';
import { logger } from '@/lib/logger';
import type { Maestro, SupportTeacher, Subject } from '@/types';

export function getMaestroOrCoach(
  focusMaestroId: string | null | undefined,
  preferredCoach?: string
): Maestro | SupportTeacher | null {
  if (focusMaestroId) {
    const maestro = getMaestroById(focusMaestroId);
    if (maestro) return maestro;

    const coach = getSupportTeacherById(
      focusMaestroId as
        | 'melissa'
        | 'roberto'
        | 'chiara'
        | 'andrea'
        | 'favij'
    );
    if (coach) return coach;

    logger.error(
      'Focus mode character not found. Verify character ID exists in maestri-full.ts or support-teachers.ts',
      {
        focusMaestroId,
        action: 'falling back to default coach',
      }
    );
  }

  if (!focusMaestroId) {
    logger.warn(
      'Focus mode entered without maestro selection, using default coach'
    );
  }

  const coachId = (preferredCoach || 'melissa') as CoachId;
  const coach = getSupportTeacherById(coachId);
  if (coach) return coach;

  return null;
}

export function getCharacterProps(char: Maestro | SupportTeacher | null) {
  if (!char) return null;
  return {
    name: char.name,
    avatar: char.avatar || '/avatars/default.jpg',
    color: char.color,
    systemPrompt: char.systemPrompt,
    greeting: char.greeting,
  };
}

export function createMaestroForVoice(
  character: Maestro | SupportTeacher,
  characterProps: ReturnType<typeof getCharacterProps>
): Maestro {
  const isSupportTeacher =
    'voice' in character && 'voiceInstructions' in character;
  return {
    id: character.id,
    name: characterProps?.name || 'Coach',
    subject: ('subject' in character
      ? character.subject
      : 'general') as Subject,
    specialty: '',
    voice: isSupportTeacher
      ? (character as SupportTeacher).voice
      : ('voice' in character && typeof (character as Maestro).voice === 'string'
          ? (character as Maestro).voice
          : 'alloy'),
    voiceInstructions: isSupportTeacher
      ? (character as SupportTeacher).voiceInstructions
      : 'Parla in modo chiaro e amichevole.',
    teachingStyle: 'Interattivo e coinvolgente',
    avatar: characterProps?.avatar || '/avatars/default.jpg',
    color: characterProps?.color || '#3b82f6',
    systemPrompt: characterProps?.systemPrompt || '',
    greeting: characterProps?.greeting || '',
  };
}

