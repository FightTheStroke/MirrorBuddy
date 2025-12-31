/**
 * ConvergioEdu Character Router
 *
 * Routes students to the appropriate character based on:
 * 1. Detected intent (academic, method, emotional)
 * 2. Student preferences (preferred coach/buddy gender)
 * 3. Subject matter (for Maestro selection)
 *
 * This is the orchestration layer of the Support Triangle.
 * Related: #24 MirrorBuddy Issue, ManifestoEdu.md
 */

import type {
  Subject,
  CharacterType,
  SupportTeacher,
  BuddyProfile,
  ExtendedStudentProfile,
  SupportCharacter,
} from '@/types';
import type { MaestroFull } from '@/data/maestri';
import { getMaestroById, getMaestriBySubject } from '@/data/maestri';
import {
  getSupportTeacherById,
  getDefaultSupportTeacher,
} from '@/data/support-teachers';
import {
  getBuddyById,
  getDefaultBuddy,
  type BuddyId,
} from '@/data/buddy-profiles';
import { detectIntent, type DetectedIntent } from './intent-detection';
import { injectSafetyGuardrails } from '@/lib/safety';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of character routing.
 */
export interface RoutingResult {
  /** The character type selected */
  characterType: CharacterType;
  /** The specific character to use */
  character: MaestroFull | SupportTeacher | BuddyProfile;
  /** The intent that led to this routing */
  intent: DetectedIntent;
  /** Why this character was selected */
  reason: string;
  /** Alternative characters that could also help */
  alternatives?: Array<{
    character: MaestroFull | SupportTeacher | BuddyProfile;
    reason: string;
  }>;
}

/**
 * Student context for routing decisions.
 */
export interface RoutingContext {
  /** The student's message to route */
  message: string;
  /** The student's profile with preferences */
  studentProfile: ExtendedStudentProfile;
  /** Currently active character (for conversation continuity) */
  currentCharacter?: {
    type: CharacterType;
    id: string;
  };
  /** Whether to prefer continuity over optimal routing */
  preferContinuity?: boolean;
}

// ============================================================================
// SUBJECT TO MAESTRO MAPPING
// ============================================================================

/**
 * Default Maestro IDs for each subject.
 * These are the "primary" Maestri for each subject.
 */
const DEFAULT_MAESTRO_BY_SUBJECT: Record<Subject, string> = {
  mathematics: 'euclide-matematica',
  physics: 'feynman-fisica',
  chemistry: 'curie-chimica',
  biology: 'darwin-biologia', // Fallback will find actual maestro if exists
  history: 'erodoto-storia',
  geography: 'humboldt-geografia',
  italian: 'manzoni-italiano',
  english: 'shakespeare-inglese',
  art: 'leonardo-arte',
  music: 'mozart-musica',
  civics: 'montessori-civica', // Fallback will find actual maestro if exists
  economics: 'smith-economia',
  computerScience: 'turing-informatica', // Fallback will find actual maestro if exists
  health: 'ippocrate-salute', // Fallback will find actual maestro if exists
  philosophy: 'socrate-filosofia',
  internationalLaw: 'grozio-diritto', // Fallback will find actual maestro if exists
};

// ============================================================================
// ROUTING FUNCTIONS
// ============================================================================

/**
 * Gets the appropriate Maestro for a subject.
 */
function getMaestroForSubject(subject: Subject): MaestroFull | undefined {
  const defaultId = DEFAULT_MAESTRO_BY_SUBJECT[subject];
  if (defaultId) {
    const maestro = getMaestroById(defaultId);
    if (maestro) return maestro;
  }

  // Fallback: get first Maestro for this subject
  const maestri = getMaestriBySubject(subject);
  return maestri[0];
}

/**
 * Gets the appropriate Coach based on student preferences.
 */
function getCoachForStudent(profile: ExtendedStudentProfile): SupportTeacher {
  if (profile.preferredCoach) {
    const preferred = getSupportTeacherById(profile.preferredCoach);
    if (preferred) {
      return preferred;
    }
  }

  // No preference: use default (Melissa)
  return getDefaultSupportTeacher();
}

/**
 * Gets the appropriate Buddy based on student preferences.
 */
export function getBuddyForStudent(profile: ExtendedStudentProfile): BuddyProfile {
  if (profile.preferredBuddy) {
    const preferred = getBuddyById(profile.preferredBuddy);
    if (preferred) {
      return preferred;
    }
  }

  // No preference: use default (Mario)
  return getDefaultBuddy();
}

/**
 * Main routing function.
 * Analyzes the message and routes to the best character.
 *
 * @param context - The routing context with message and student profile
 * @returns Routing result with selected character and reasoning
 *
 * @example
 * const result = routeToCharacter({
 *   message: "Non capisco le equazioni di secondo grado",
 *   studentProfile: { age: 14, learningDifferences: ['adhd'] },
 * });
 * // Returns: { characterType: 'maestro', character: euclide, ... }
 */
export function routeToCharacter(context: RoutingContext): RoutingResult {
  const { message, studentProfile, currentCharacter, preferContinuity } = context;

  // 1. Detect intent
  const intent = detectIntent(message);

  // 2. Check for continuity preference
  if (preferContinuity && currentCharacter) {
    // If confidence is not very high, stay with current character
    if (intent.confidence < 0.8 && intent.type !== 'crisis') {
      return getCurrentCharacterResult(currentCharacter, intent, studentProfile);
    }
  }

  // 3. Route based on intent type
  switch (intent.type) {
    case 'crisis':
      // Crisis: Buddy for peer support + adult referral
      return {
        characterType: 'buddy',
        character: getBuddyForStudent(studentProfile),
        intent,
        reason: 'Crisis detected - peer support with built-in adult referral',
      };

    case 'academic_help':
      // Academic: Maestro for the subject
      if (intent.subject) {
        const maestro = getMaestroForSubject(intent.subject);
        if (maestro) {
          return {
            characterType: 'maestro',
            character: maestro,
            intent,
            reason: `Subject expert for ${intent.subject}`,
            alternatives: getAcademicAlternatives(intent, studentProfile),
          };
        }
      }
      // No subject detected, fallback to coach
      return {
        characterType: 'coach',
        character: getCoachForStudent(studentProfile),
        intent,
        reason: 'Academic help needed but no specific subject - coach can help identify',
      };

    case 'method_help':
      // Method/organization: Coach
      return {
        characterType: 'coach',
        character: getCoachForStudent(studentProfile),
        intent,
        reason: 'Study method or organization help - coach specialty',
        alternatives: intent.subject ? [{
          character: getMaestroForSubject(intent.subject)!,
          reason: 'Subject expert for specific content',
        }].filter(a => a.character) : undefined,
      };

    case 'tool_request':
      // Tool creation: Maestro if subject known, otherwise coach
      if (intent.subject) {
        const maestro = getMaestroForSubject(intent.subject);
        if (maestro) {
          return {
            characterType: 'maestro',
            character: maestro,
            intent,
            reason: 'Tool creation request - subject expert can create appropriate content',
          };
        }
      }
      return {
        characterType: 'coach',
        character: getCoachForStudent(studentProfile),
        intent,
        reason: 'Tool creation request - coach can help organize and create',
      };

    case 'emotional_support':
      // Emotional: Buddy
      return {
        characterType: 'buddy',
        character: getBuddyForStudent(studentProfile),
        intent,
        reason: 'Emotional support needed - peer can relate and validate',
        alternatives: [{
          character: getCoachForStudent(studentProfile),
          reason: 'Coach for practical coping strategies',
        }],
      };

    case 'tech_support':
      // Tech support: Coach with knowledge base (Issue #16)
      // Uses student's preferred coach, NOT a separate character
      return {
        characterType: 'coach',
        character: getCoachForStudent(studentProfile),
        intent,
        reason: "Technical support with app - coach uses knowledge base",
      };

    case 'general_chat':
    default:
      // General: Coach as neutral starting point
      return {
        characterType: 'coach',
        character: getCoachForStudent(studentProfile),
        intent,
        reason: 'General conversation - coach can help identify needs',
      };
  }
}

/**
 * Gets the current character for continuity.
 */
function getCurrentCharacterResult(
  current: { type: CharacterType; id: string },
  intent: DetectedIntent,
  profile: ExtendedStudentProfile
): RoutingResult {
  let character: MaestroFull | SupportTeacher | BuddyProfile | undefined;

  switch (current.type) {
    case 'maestro':
      character = getMaestroById(current.id);
      break;
    case 'coach':
      character = getSupportTeacherById(current.id as 'melissa' | 'roberto');
      break;
    case 'buddy':
      character = getBuddyById(current.id as BuddyId);
      break;
  }

  // Fallback if current character not found
  if (!character) {
    return routeToCharacter({ message: '', studentProfile: profile });
  }

  return {
    characterType: current.type,
    character,
    intent,
    reason: 'Continuing conversation with current character',
  };
}

/**
 * Gets alternative characters for academic help.
 */
function getAcademicAlternatives(
  intent: DetectedIntent,
  profile: ExtendedStudentProfile
): Array<{ character: MaestroFull | SupportTeacher | BuddyProfile; reason: string }> {
  const alternatives: Array<{ character: MaestroFull | SupportTeacher | BuddyProfile; reason: string }> = [];

  // If emotional indicators, suggest buddy
  if (intent.emotionalIndicators && intent.emotionalIndicators.length > 0) {
    alternatives.push({
      character: getBuddyForStudent(profile),
      reason: 'Peer support for emotional aspects',
    });
  }

  // Always suggest coach as backup
  alternatives.push({
    character: getCoachForStudent(profile),
    reason: 'Study method support',
  });

  return alternatives;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

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
