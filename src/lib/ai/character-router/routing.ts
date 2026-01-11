/**
 * Core character routing logic.
 * Routes students to the appropriate character based on detected intent and preferences.
 */

import type { CharacterType, ExtendedStudentProfile } from '@/types';
import type { MaestroFull } from '@/data/maestri';
import type { SupportTeacher, BuddyProfile } from '@/types';
import { detectIntent, type DetectedIntent } from '../intent-detection';
import {
  getMaestroForSubject,
  getCoachForStudent,
  getBuddyForStudent,
  getCurrentCharacter,
} from './selection';
import type { RoutingResult, RoutingContext } from './types';

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
  const { message, studentProfile, currentCharacter, preferContinuity } =
    context;

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
        alternatives: intent.subject
          ? [
              {
                character: getMaestroForSubject(intent.subject)!,
                reason: 'Subject expert for specific content',
              },
            ].filter((a) => a.character)
          : undefined,
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
        alternatives: [
          {
            character: getCoachForStudent(studentProfile),
            reason: 'Coach for practical coping strategies',
          },
        ],
      };

    case 'tech_support':
      // Tech support: Coach with knowledge base (Issue #16)
      // Uses student's preferred coach, NOT a separate character
      return {
        characterType: 'coach',
        character: getCoachForStudent(studentProfile),
        intent,
        reason: 'Technical support with app - coach uses knowledge base',
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
  const character = getCurrentCharacter(current.type, current.id);

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
): Array<{
  character: MaestroFull | SupportTeacher | BuddyProfile;
  reason: string;
}> {
  const alternatives: Array<{
    character: MaestroFull | SupportTeacher | BuddyProfile;
    reason: string;
  }> = [];

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
