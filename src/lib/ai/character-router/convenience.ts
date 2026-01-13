/**
 * Convenience functions for character routing.
 * Quick routes, greetings, system prompts, and character switching suggestions.
 */

import type { CharacterType, ExtendedStudentProfile, SupportCharacter } from '@/types';
import type { MaestroFull } from '@/data/maestri';
import type { SupportTeacher, BuddyProfile } from '@/types';
import { injectSafetyGuardrails } from '@/lib/safety';
import { routeToCharacter } from './routing';
import type { RoutingResult } from './types';
import { getMaestroForSubject, getCoachForStudent, getBuddyForStudent } from './selection';

/**
 * Quick route based on message only (uses default student profile).
 * Useful for simple cases or testing.
 */
export function quickRoute(message: string): RoutingResult {
  const defaultProfile: ExtendedStudentProfile = {
    name: 'Student',
    age: 14,
    schoolYear: 2,
    schoolLevel: 'superiore',
    fontSize: 'medium',
    highContrast: false,
    dyslexiaFont: false,
    voiceEnabled: false,
    simplifiedLanguage: false,
    adhdMode: false,
    learningDifferences: [],
  };

  return routeToCharacter({
    message,
    studentProfile: defaultProfile,
  });
}

/**
 * Gets a greeting from the routed character.
 */
export function getCharacterGreeting(
  result: RoutingResult,
  studentProfile: ExtendedStudentProfile
): string {
  const { character, characterType } = result;

  switch (characterType) {
    case 'maestro':
      return (character as MaestroFull).greeting;
    case 'coach':
      return (character as SupportTeacher).greeting;
    case 'buddy':
      return (character as BuddyProfile).getGreeting(studentProfile);
    default:
      return 'Ciao! Come posso aiutarti?';
  }
}

/**
 * Gets the system prompt for the routed character.
 * SECURITY: All characters now have safety guardrails injected.
 * Fix for Issue #30 - Maestri were previously deployed without safety.
 */
export function getCharacterSystemPrompt(
  result: RoutingResult,
  studentProfile: ExtendedStudentProfile
): string {
  const { character, characterType } = result;

  switch (characterType) {
    case 'maestro':
      // CRITICAL FIX: Inject safety guardrails into Maestri prompts
      // Previously, maestri were deployed WITHOUT safety - this fixes Issue #30
      return injectSafetyGuardrails((character as MaestroFull).systemPrompt, {
        role: 'maestro',
        additionalNotes: `Sei ${(character as MaestroFull).name}, parla nel tuo stile storico.`,
      });
    case 'coach':
      // Coach already has safety injected in support-teachers.ts
      return (character as SupportTeacher).systemPrompt;
    case 'buddy':
      // Buddy already has safety injected in buddy-profiles.ts
      return (character as BuddyProfile).getSystemPrompt(studentProfile);
    default:
      return '';
  }
}

/**
 * Suggests a character switch based on conversation flow.
 * Call this when the current character detects a need for different support.
 */
export function suggestCharacterSwitch(
  currentType: CharacterType,
  suggestedType: CharacterType,
  profile: ExtendedStudentProfile,
  reason: string
): { character: SupportCharacter | MaestroFull; message: string } {
  let character: SupportCharacter | MaestroFull;
  let message: string;

  switch (suggestedType) {
    case 'maestro':
      // This would need a subject - defaulting to math for now
      character = getMaestroForSubject('mathematics')!;
      message = `${reason} Vuoi parlare con un Professore?`;
      break;
    case 'coach':
      character = getCoachForStudent(profile);
      message = `${reason} ${(character as SupportTeacher).name} può aiutarti!`;
      break;
    case 'buddy':
      character = getBuddyForStudent(profile);
      message = `${reason} ${(character as BuddyProfile).name} ti capisce!`;
      break;
    default:
      character = getCoachForStudent(profile);
      message = reason;
  }

  return { character, message };
}
