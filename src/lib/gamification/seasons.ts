/**
 * Season System Utilities
 * Italian school trimesters aligned with calendar quarters
 */

import type { Season, SeasonName } from '@/types';

/**
 * Check if a year is a leap year.
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Get the last day of February for a given year.
 */
function getFebruaryEndDay(year: number): number {
  return isLeapYear(year) ? 29 : 28;
}

/**
 * Get the current season based on today's date.
 * Seasons are aligned with Italian school trimesters:
 * - Autunno (Fall): Sep 1 - Nov 30
 * - Inverno (Winter): Dec 1 - Feb 28/29
 * - Primavera (Spring): Mar 1 - May 31
 * - Estate (Summer): Jun 1 - Aug 31
 */
export function getCurrentSeason(): Season {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();

  if (month >= 8 && month <= 10) {
    // Sep, Oct, Nov (8, 9, 10)
    return {
      name: 'Autunno',
      startDate: new Date(year, 8, 1), // Sep 1
      endDate: new Date(year, 10, 30, 23, 59, 59), // Nov 30
      icon: '🍂',
    };
  } else if (month === 11 || month === 0 || month === 1) {
    // Dec, Jan, Feb (11, 0, 1)
    const endYear = month === 11 ? year + 1 : year;
    return {
      name: 'Inverno',
      startDate: new Date(month === 11 ? year : year - 1, 11, 1), // Dec 1
      endDate: new Date(endYear, 1, getFebruaryEndDay(endYear), 23, 59, 59),
      icon: '❄️',
    };
  } else if (month >= 2 && month <= 4) {
    // Mar, Apr, May (2, 3, 4)
    return {
      name: 'Primavera',
      startDate: new Date(year, 2, 1), // Mar 1
      endDate: new Date(year, 4, 31, 23, 59, 59), // May 31
      icon: '🌸',
    };
  } else {
    // Jun, Jul, Aug (5, 6, 7)
    return {
      name: 'Estate',
      startDate: new Date(year, 5, 1), // Jun 1
      endDate: new Date(year, 7, 31, 23, 59, 59), // Aug 31
      icon: '☀️',
    };
  }
}

/**
 * Get days remaining in the current season.
 */
export function getDaysRemainingInSeason(): number {
  const season = getCurrentSeason();
  const now = new Date();
  const diff = season.endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Check if a season has changed since the last check.
 */
export function hasSeasonChanged(lastSeason: SeasonName): boolean {
  const currentSeason = getCurrentSeason();
  return currentSeason.name !== lastSeason;
}

/**
 * Get season by name and year.
 */
export function getSeasonByName(name: SeasonName, year: number): Season {
  switch (name) {
    case 'Autunno':
      return {
        name: 'Autunno',
        startDate: new Date(year, 8, 1),
        endDate: new Date(year, 10, 30, 23, 59, 59),
        icon: '🍂',
      };
    case 'Inverno':
      return {
        name: 'Inverno',
        startDate: new Date(year, 11, 1),
        endDate: new Date(year + 1, 1, getFebruaryEndDay(year + 1), 23, 59, 59),
        icon: '❄️',
      };
    case 'Primavera':
      return {
        name: 'Primavera',
        startDate: new Date(year, 2, 1),
        endDate: new Date(year, 4, 31, 23, 59, 59),
        icon: '🌸',
      };
    case 'Estate':
      return {
        name: 'Estate',
        startDate: new Date(year, 5, 1),
        endDate: new Date(year, 7, 31, 23, 59, 59),
        icon: '☀️',
      };
  }
}
