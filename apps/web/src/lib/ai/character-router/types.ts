/**
 * Types for character routing.
 */

import type {
  CharacterType,
  ExtendedStudentProfile,
} from '@/types';
import type { MaestroFull } from '@/data/maestri';
import type { SupportTeacher } from '@/types';
import type { BuddyProfile } from '@/types';
import type { DetectedIntent } from '../intent-detection';

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
