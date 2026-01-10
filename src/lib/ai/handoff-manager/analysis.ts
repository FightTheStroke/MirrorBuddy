/**
 * Handoff analysis logic
 */

import type {
  ExtendedStudentProfile,
  CharacterType,
} from '@/types';
import type { MaestroFull } from '@/data/maestri';
import type { ActiveCharacter } from '@/lib/stores/conversation-flow-store';
import { detectIntent } from './intent-detection';
import type { HandoffContext, HandoffAnalysis } from './types';
import { INTENT_HANDOFF_MAP, HANDOFF_SIGNAL_PATTERNS } from './patterns';
import { getMaestriBySubject } from '@/data/maestri';

/**
 * Analyzes whether a handoff should occur
 */
export function analyzeHandoff(context: HandoffContext): HandoffAnalysis {
  const { message, aiResponse, activeCharacter, studentProfile } = context;

  if (aiResponse) {
    const explicitHandoff = detectExplicitHandoff(aiResponse, activeCharacter);
    if (explicitHandoff.shouldHandoff) {
      return explicitHandoff;
    }
  }

  const intent = detectIntent(message);
  const intentMismatch = checkIntentMismatch(intent.type, activeCharacter.type, studentProfile);
  if (intentMismatch.shouldHandoff) {
    return intentMismatch;
  }

  const crisisCheck = detectCrisisSignals(message, aiResponse || '');
  if (crisisCheck.shouldHandoff) {
    return crisisCheck;
  }

  if (activeCharacter.type === 'maestro' && intent.subject) {
    const subjectChange = checkSubjectChange(
      activeCharacter.character as MaestroFull,
      intent.subject,
      studentProfile
    );
    if (subjectChange.shouldHandoff) {
      return subjectChange;
    }
  }

  return {
    shouldHandoff: false,
    confidence: 0.9,
    reason: 'Current character is appropriate for this conversation',
  };
}

/**
 * Detects explicit handoff suggestions in AI response
 */
function detectExplicitHandoff(response: string, currentCharacter: ActiveCharacter): HandoffAnalysis {
  for (const pattern of HANDOFF_SIGNAL_PATTERNS.maestro_suggestion) {
    if (pattern.test(response) && currentCharacter.type !== 'maestro') {
      return {
        shouldHandoff: true,
        confidence: 0.85,
        reason: 'AI suggested a subject expert',
      };
    }
  }

  for (const pattern of HANDOFF_SIGNAL_PATTERNS.buddy_suggestion) {
    if (pattern.test(response) && currentCharacter.type !== 'buddy') {
      return {
        shouldHandoff: true,
        confidence: 0.8,
        reason: 'AI detected emotional need and suggested peer support',
      };
    }
  }

  for (const pattern of HANDOFF_SIGNAL_PATTERNS.coach_suggestion) {
    if (pattern.test(response) && currentCharacter.type !== 'coach') {
      return {
        shouldHandoff: true,
        confidence: 0.8,
        reason: 'AI suggested organization/method support',
      };
    }
  }

  return { shouldHandoff: false, confidence: 0, reason: '' };
}

/**
 * Checks if the detected intent mismatches the current character
 */
function checkIntentMismatch(
  intentType: string,
  currentType: CharacterType,
  _profile: ExtendedStudentProfile
): HandoffAnalysis {
  const suggestedType = INTENT_HANDOFF_MAP[intentType as keyof typeof INTENT_HANDOFF_MAP];

  if (!suggestedType || suggestedType === currentType) {
    return { shouldHandoff: false, confidence: 0, reason: '' };
  }

  return {
    shouldHandoff: true,
    confidence: 0.7,
    reason: `Message intent (${intentType}) suggests ${suggestedType} would be better`,
  };
}

/**
 * Detects crisis signals requiring immediate support
 */
function detectCrisisSignals(message: string, response: string): HandoffAnalysis {
  const combined = `${message} ${response}`.toLowerCase();

  for (const pattern of HANDOFF_SIGNAL_PATTERNS.crisis_signals) {
    if (pattern.test(combined)) {
      return {
        shouldHandoff: true,
        confidence: 0.95,
        reason: 'Crisis signals detected - immediate peer support recommended',
      };
    }
  }

  return { shouldHandoff: false, confidence: 0, reason: '' };
}

/**
 * Checks if the student is asking about a different subject
 */
function checkSubjectChange(
  currentMaestro: MaestroFull,
  newSubject: string,
  _profile: ExtendedStudentProfile
): HandoffAnalysis {
  const currentSubject = currentMaestro.subject;

  if (currentSubject === newSubject) {
    return { shouldHandoff: false, confidence: 0, reason: '' };
  }

  const newMaestri = getMaestriBySubject(newSubject);
  if (newMaestri.length > 0) {
    return {
      shouldHandoff: true,
      confidence: 0.85,
      reason: `Student asked about ${newSubject} while with ${currentSubject} Maestro`,
    };
  }

  return { shouldHandoff: false, confidence: 0, reason: '' };
}

/**
 * Quick check if a handoff might be needed
 */
export function mightNeedHandoff(message: string): boolean {
  const intent = detectIntent(message);

  if (intent.confidence > 0.7) {
    if (intent.type === 'crisis') return true;
    if (intent.type === 'emotional_support') return true;
    if (intent.subject) return true;
  }

  return false;
}
