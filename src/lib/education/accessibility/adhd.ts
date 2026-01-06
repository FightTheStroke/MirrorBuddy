/**
 * @file adhd.ts
 * @brief ADHD support functions (AD01-06)
 */

import type { AccessibilityProfile } from './types';
import { Severity } from './types';

/**
 * Limit bullet points to reduce cognitive load
 * AD01: Max 3-5 bullets for ADHD students
 */
export function limitBulletPoints(text: string, maxBullets: number = 5): string {
  const lines = text.split('\n');
  const bulletLines: string[] = [];
  const otherLines: string[] = [];

  for (const line of lines) {
    if (line.trim().match(/^[-*•]\s/)) {
      bulletLines.push(line);
    } else {
      otherLines.push(line);
    }
  }

  const limitedBullets = bulletLines.slice(0, maxBullets);

  if (bulletLines.length > maxBullets) {
    limitedBullets.push(`... e altri ${bulletLines.length - maxBullets} punti`);
  }

  return [...otherLines, ...limitedBullets].join('\n');
}

/**
 * Get recommended session duration for ADHD
 * AD02: Shorter sessions (15-20 min) for better focus
 */
export function getSessionDuration(profile: AccessibilityProfile): number {
  if (!profile.adhd) {
    return 30 * 60; // 30 minutes default
  }

  switch (profile.adhdSeverity) {
    case Severity.SEVERE:
      return 10 * 60; // 10 minutes
    case Severity.MODERATE:
      return 15 * 60; // 15 minutes
    case Severity.MILD:
      return 20 * 60; // 20 minutes
    default:
      return 30 * 60;
  }
}

/**
 * Check if break reminder should be shown
 * AD03: Regular break reminders for ADHD
 */
export function shouldShowBreakReminder(
  sessionStart: Date,
  profile: AccessibilityProfile
): boolean {
  if (!profile.adhd) {
    return false;
  }

  const sessionDuration = getSessionDuration(profile);
  const elapsed = (Date.now() - sessionStart.getTime()) / 1000;

  return elapsed >= sessionDuration;
}

/**
 * Get maximum bullet points based on ADHD severity
 * AD04: Fewer items for higher severity
 */
export function getMaxBullets(profile: AccessibilityProfile): number {
  if (!profile.adhd) {
    return 10;
  }

  switch (profile.adhdSeverity) {
    case Severity.SEVERE:
      return 3;
    case Severity.MODERATE:
      return 5;
    case Severity.MILD:
      return 7;
    default:
      return 10;
  }
}

/**
 * Generate progress bar for task completion
 * AD05: Visual progress indicators for motivation
 */
export function generateProgressBar(current: number, total: number, width: number = 20): string {
  const percentage = Math.min(100, (current / total) * 100);
  const filled = Math.round((width * percentage) / 100);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  return `[${bar}] ${percentage.toFixed(0)}% (${current}/${total})`;
}

/**
 * Get celebration message based on achievement
 * AD06: Positive reinforcement for ADHD students
 */
export function getCelebrationMessage(achievementLevel: number): string {
  const messages = [
    'Ben fatto! Continua così!',
    'Fantastico! Stai facendo progressi!',
    'Eccellente lavoro! Sei in gamba!',
    'Straordinario! Sei un campione!',
    'Incredibile! Hai superato te stesso!',
  ];

  return messages[Math.min(achievementLevel, messages.length - 1)];
}

/**
 * Check if gamification should be enhanced
 */
export function shouldEnhanceGamification(profile: AccessibilityProfile): boolean {
  return profile.adhd && profile.adhdSeverity >= Severity.MODERATE;
}

