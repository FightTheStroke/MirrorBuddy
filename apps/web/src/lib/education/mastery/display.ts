/**
 * @file display.ts
 * @brief Display helper functions for mastery
 */

import { SkillStatus } from './types';

/**
 * Get status label for display
 */
export function getStatusLabel(status: SkillStatus): string {
  switch (status) {
    case SkillStatus.MASTERED:
      return "Mastered";
    case SkillStatus.PROFICIENT:
      return "Proficient";
    case SkillStatus.FAMILIAR:
      return "Familiar";
    case SkillStatus.ATTEMPTED:
      return "In Progress";
    case SkillStatus.NOT_STARTED:
      return "Not Started";
    default:
      return "Unknown";
  }
}

/**
 * Get status emoji for display
 */
export function getStatusEmoji(status: SkillStatus): string {
  switch (status) {
    case SkillStatus.MASTERED:
      return "✅";
    case SkillStatus.PROFICIENT:
      return "🟢";
    case SkillStatus.FAMILIAR:
      return "🟡";
    case SkillStatus.ATTEMPTED:
      return "🟠";
    case SkillStatus.NOT_STARTED:
      return "⚪";
    default:
      return "❓";
  }
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: SkillStatus): string {
  switch (status) {
    case SkillStatus.MASTERED:
      return "#22c55e"; // green-500
    case SkillStatus.PROFICIENT:
      return "#84cc16"; // lime-500
    case SkillStatus.FAMILIAR:
      return "#eab308"; // yellow-500
    case SkillStatus.ATTEMPTED:
      return "#f97316"; // orange-500
    case SkillStatus.NOT_STARTED:
      return "#94a3b8"; // slate-400
    default:
      return "#64748b"; // slate-500
  }
}

