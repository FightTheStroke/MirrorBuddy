import type { MindMapProgress, FlashcardProgress, MethodProgress, ToolType, Subject, HelpLevel } from '../types';
import { calculateSkillLevel } from './utils';

export function updateMindMapProgress(
  current: MindMapProgress,
  helpLevel: HelpLevel,
  qualityScore?: number
): MindMapProgress {
  const updated = { ...current };

  switch (helpLevel) {
    case 'none':
      updated.createdAlone += 1;
      break;
    case 'hints':
      updated.createdWithHints += 1;
      break;
    case 'full':
      updated.createdWithFullHelp += 1;
      break;
  }

  if (qualityScore !== undefined) {
    const total =
      updated.createdAlone + updated.createdWithHints + updated.createdWithFullHelp;
    const currentTotal = updated.avgQualityScore * (total - 1);
    updated.avgQualityScore = (currentTotal + qualityScore) / total;
  }

  const total = updated.createdAlone + updated.createdWithHints + updated.createdWithFullHelp;
  const independenceRatio = total > 0 ? (updated.createdAlone / total) * 100 : 0;
  updated.level = calculateSkillLevel(independenceRatio, 100);

  return updated;
}

export function updateFlashcardProgress(
  current: FlashcardProgress,
  helpLevel: HelpLevel
): FlashcardProgress {
  const updated = { ...current };

  switch (helpLevel) {
    case 'none':
      updated.createdAlone += 1;
      break;
    case 'hints':
    case 'full':
      updated.createdWithHints += 1;
      break;
  }

  const total = updated.createdAlone + updated.createdWithHints;
  const independenceRatio = total > 0 ? (updated.createdAlone / total) * 100 : 0;
  updated.level = calculateSkillLevel(independenceRatio, 100);

  return updated;
}

export function trackMethodTransfer(
  current: MethodProgress['methodTransfer'],
  method: ToolType,
  subject: Subject
): MethodProgress['methodTransfer'] {
  const updated = { ...current };

  if (!updated.subjectsApplied.includes(subject)) {
    updated.subjectsApplied = [...updated.subjectsApplied, subject];
    updated.adaptations += 1;
  }

  if (!updated.successfulMethods.includes(method)) {
    updated.successfulMethods = [...updated.successfulMethods, method];
  }

  updated.level = calculateSkillLevel(updated.subjectsApplied.length * 20, 100);

  return updated;
}

