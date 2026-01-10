/**
 * Type definitions for handoff management
 */

import type {
  CharacterType,
  ExtendedStudentProfile,
} from '@/types';
import type { ActiveCharacter, HandoffSuggestion } from '@/lib/stores/conversation-flow-store';
import type { IntentType } from './intent-detection/types';

export interface HandoffContext {
  message: string;
  aiResponse?: string;
  activeCharacter: ActiveCharacter;
  studentProfile: ExtendedStudentProfile;
  recentMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface HandoffAnalysis {
  shouldHandoff: boolean;
  suggestion?: HandoffSuggestion;
  confidence: number;
  reason: string;
}

export type HandoffTrigger =
  | 'explicit_suggestion'
  | 'subject_mismatch'
  | 'emotional_need'
  | 'method_need'
  | 'stuck_pattern'
  | 'crisis_detected'
  | 'academic_deep_dive';
