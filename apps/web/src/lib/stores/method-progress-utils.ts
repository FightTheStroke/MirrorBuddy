/**
 * Method Progress Store Utilities
 * Helper functions for autonomy tracking calculations
 */

import type {
  MindMapProgress,
  FlashcardProgress,
  SelfAssessmentProgress,
  HelpBehavior,
  MethodTransfer,
  SkillLevel,
} from '@/lib/method-progress/types';
import { LEVEL_THRESHOLDS } from '@/lib/method-progress/types';

/**
 * Calculate skill level from progress percentage
 */
export function calculateLevel(progress: number): SkillLevel {
  if (progress >= LEVEL_THRESHOLDS.expert) return 'expert';
  if (progress >= LEVEL_THRESHOLDS.competent) return 'competent';
  if (progress >= LEVEL_THRESHOLDS.learning) return 'learning';
  return 'novice';
}

/**
 * Calculate autonomy score from all metrics
 */
export function calculateAutonomyScore(state: {
  mindMaps: MindMapProgress;
  flashcards: FlashcardProgress;
  selfAssessment: SelfAssessmentProgress;
  helpBehavior: HelpBehavior;
  methodTransfer: MethodTransfer;
}): number {
  const { mindMaps, flashcards, helpBehavior, methodTransfer } = state;

  const aloneRatio =
    helpBehavior.solvedAlone / Math.max(1, helpBehavior.questionsAsked + helpBehavior.solvedAlone);
  const selfCorrectionRatio = helpBehavior.selfCorrections / Math.max(1, helpBehavior.questionsAsked);
  const toolsAloneRatio =
    (mindMaps.createdAlone + flashcards.createdAlone) /
    Math.max(
      1,
      mindMaps.createdAlone +
        mindMaps.createdWithHints +
        mindMaps.createdWithFullHelp +
        flashcards.createdAlone +
        flashcards.createdWithHints
    );
  const transferBonus = Math.min(1, methodTransfer.subjectsApplied.length / 5);

  return aloneRatio * 0.3 + selfCorrectionRatio * 0.2 + toolsAloneRatio * 0.3 + transferBonus * 0.2;
}
