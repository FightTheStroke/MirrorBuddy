import type { Subject, ToolType } from '@/types';

export type EmotionalIndicator =
  | 'frustration'
  | 'anxiety'
  | 'sadness'
  | 'loneliness'
  | 'overwhelm'
  | 'excitement'
  | 'confidence';

export type CharacterType = 'maestro' | 'coach' | 'buddy';

export type IntentType =
  | 'academic_help'
  | 'method_help'
  | 'tool_request'
  | 'emotional_support'
  | 'tech_support'
  | 'crisis'
  | 'general_chat';

export interface DetectedIntent {
  type: IntentType;
  confidence: number;
  subject?: Subject;
  toolType?: ToolType;
  emotionalIndicators: EmotionalIndicator[];
  recommendedCharacter: CharacterType;
  reason: string;
}

