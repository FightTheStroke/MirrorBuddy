/**
 * Types for Character Router
 */

import type { CharacterType, SupportTeacher, BuddyProfile, ExtendedStudentProfile } from '@/types';
import type { MaestroFull } from '@/data/maestri';
import type { DetectedIntent } from '@/lib/ai/intent-detection';

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
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Context for routing decisions.
 */
export interface RoutingContext {
  /** The student's profile */
  profile: ExtendedStudentProfile;
  /** The current message or query */
  message?: string;
  /** The subject being discussed */
  subject?: string;
  /** Current character (if switching) */
  currentCharacter?: CharacterType;
  /** User's preferred coach/buddy */
  preferences?: {
    preferredCoachGender?: 'male' | 'female' | 'neutral';
    preferredBuddyGender?: 'male' | 'female' | 'neutral';
  };
}
