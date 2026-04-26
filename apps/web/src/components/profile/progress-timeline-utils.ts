import type { DiaryEntry } from './teacher-diary';

export interface WeeklyData {
  weekLabel: string;
  weekStart: Date;
  strengths: number;
  growthAreas: number;
  total: number;
}

export interface Improvements {
  strengthsTrend: number;
  activityTrend: number;
  moreStrengthsThanGrowth: boolean;
}

/**
 * Group diary entries by week and calculate weekly statistics
 */
export function calculateWeeklyData(entries: DiaryEntry[]): WeeklyData[] {
  if (entries.length === 0) return [];

  // Get date range
  const dates = entries.map(e => new Date(e.createdAt).getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  // Generate weeks
  const weeks: WeeklyData[] = [];
  const currentWeekStart = new Date(minDate);
  currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
  currentWeekStart.setHours(0, 0, 0, 0);

  while (currentWeekStart <= maxDate) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekEntries = entries.filter(e => {
      const entryDate = new Date(e.createdAt);
      return entryDate >= currentWeekStart && entryDate < weekEnd;
    });

    const strengths = weekEntries.filter(e => e.isStrength).length;
    const growthAreas = weekEntries.filter(e => !e.isStrength).length;

    weeks.push({
      weekLabel: currentWeekStart.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
      weekStart: new Date(currentWeekStart),
      strengths,
      growthAreas,
      total: weekEntries.length,
    });

    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }

  return weeks.slice(-8); // Last 8 weeks
}

/**
 * Calculate trend improvements from weekly data
 */
export function calculateImprovements(weeklyData: WeeklyData[]): Improvements | null {
  if (weeklyData.length < 2) return null;

  const firstHalf = weeklyData.slice(0, Math.floor(weeklyData.length / 2));
  const secondHalf = weeklyData.slice(Math.floor(weeklyData.length / 2));

  const avgStrengthsFirst = firstHalf.reduce((sum, w) => sum + w.strengths, 0) / firstHalf.length;
  const avgStrengthsSecond = secondHalf.reduce((sum, w) => sum + w.strengths, 0) / secondHalf.length;

  const avgGrowthSecond = secondHalf.reduce((sum, w) => sum + w.growthAreas, 0) / secondHalf.length;

  const strengthsTrend = avgStrengthsSecond - avgStrengthsFirst;
  const activityTrend = (secondHalf.reduce((sum, w) => sum + w.total, 0) / secondHalf.length) -
                        (firstHalf.reduce((sum, w) => sum + w.total, 0) / firstHalf.length);

  return {
    strengthsTrend,
    activityTrend,
    moreStrengthsThanGrowth: avgStrengthsSecond > avgGrowthSecond,
  };
}
