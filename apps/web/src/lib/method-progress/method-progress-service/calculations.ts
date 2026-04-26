import type { MethodProgress, SkillLevel, SkillDisplay } from '../types';
import { LEVEL_DISPLAY } from '../types';
import { calculateProgressPercentage } from './utils';
import { getMindMapMessage, getFlashcardMessage, getSelfAssessmentMessage, getAutonomyMessage } from './messages';

export function calculateAutonomyScore(progress: MethodProgress): number {
  const weights = {
    mindMaps: 0.2,
    flashcards: 0.2,
    selfAssessment: 0.15,
    helpBehavior: 0.3,
    methodTransfer: 0.15,
  };

  const levelToScore = (level: SkillLevel): number => {
    switch (level) {
      case 'expert':
        return 1.0;
      case 'competent':
        return 0.7;
      case 'learning':
        return 0.4;
      default:
        return 0.1;
    }
  };

  const score =
    levelToScore(progress.mindMaps.level) * weights.mindMaps +
    levelToScore(progress.flashcards.level) * weights.flashcards +
    levelToScore(progress.selfAssessment.level) * weights.selfAssessment +
    levelToScore(progress.helpBehavior.level) * weights.helpBehavior +
    levelToScore(progress.methodTransfer.level) * weights.methodTransfer;

  return Math.round(score * 100) / 100;
}

export function getSkillDisplays(progress: MethodProgress): SkillDisplay[] {
  return [
    {
      name: 'Mappe Mentali',
      icon: '🗺️',
      progress: calculateProgressPercentage(progress.mindMaps.level),
      level: progress.mindMaps.level,
      message: getMindMapMessage(progress.mindMaps),
      color: '#3b82f6',
    },
    {
      name: 'Flashcard',
      icon: '📇',
      progress: calculateProgressPercentage(progress.flashcards.level),
      level: progress.flashcards.level,
      message: getFlashcardMessage(progress.flashcards),
      color: '#10b981',
    },
    {
      name: 'Auto-valutazione',
      icon: '🔍',
      progress: calculateProgressPercentage(progress.selfAssessment.level),
      level: progress.selfAssessment.level,
      message: getSelfAssessmentMessage(progress.selfAssessment),
      color: '#f59e0b',
    },
    {
      name: 'Autonomia',
      icon: '🚀',
      progress: Math.round(progress.autonomyScore * 100),
      level: progress.helpBehavior.level,
      message: getAutonomyMessage(progress.helpBehavior),
      color: '#8b5cf6',
    },
  ];
}

export function formatLevel(level: SkillLevel): { name: string; emoji: string } {
  return LEVEL_DISPLAY[level];
}

export function compareProgress(
  current: MethodProgress,
  previous: MethodProgress
): {
  autonomyChange: number;
  improvingAreas: string[];
  needsWorkAreas: string[];
} {
  const autonomyChange = current.autonomyScore - previous.autonomyScore;

  const improvingAreas: string[] = [];
  const needsWorkAreas: string[] = [];

  const areas: { name: string; currentLevel: SkillLevel; previousLevel: SkillLevel }[] = [
    {
      name: 'Mappe Mentali',
      currentLevel: current.mindMaps.level,
      previousLevel: previous.mindMaps.level,
    },
    {
      name: 'Flashcard',
      currentLevel: current.flashcards.level,
      previousLevel: previous.flashcards.level,
    },
    {
      name: 'Auto-valutazione',
      currentLevel: current.selfAssessment.level,
      previousLevel: previous.selfAssessment.level,
    },
    {
      name: 'Autonomia',
      currentLevel: current.helpBehavior.level,
      previousLevel: previous.helpBehavior.level,
    },
  ];

  const levelOrder: SkillLevel[] = ['novice', 'learning', 'competent', 'expert'];

  for (const area of areas) {
    const currentIndex = levelOrder.indexOf(area.currentLevel);
    const previousIndex = levelOrder.indexOf(area.previousLevel);

    if (currentIndex > previousIndex) {
      improvingAreas.push(area.name);
    } else if (currentIndex < previousIndex) {
      needsWorkAreas.push(area.name);
    }
  }

  return { autonomyChange, improvingAreas, needsWorkAreas };
}

