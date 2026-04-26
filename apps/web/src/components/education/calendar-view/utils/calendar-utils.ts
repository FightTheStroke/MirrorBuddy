/**
 * @file calendar-utils.ts
 * @brief Calendar utility functions
 */

import type { SchoolEvent } from '@/lib/stores';

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  events: SchoolEvent[];
}

export function getCalendarDays(
  currentMonth: Date,
  events: SchoolEvent[]
): CalendarDay[] {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

  const days: CalendarDay[] = [];

  for (let i = startPadding - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push({
      date,
      isCurrentMonth: false,
      events: events.filter((e) => isSameDay(new Date(e.date), date)),
    });
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i);
    days.push({
      date,
      isCurrentMonth: true,
      events: events.filter((e) => isSameDay(new Date(e.date), date)),
    });
  }

  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const date = new Date(year, month + 1, i);
    days.push({
      date,
      isCurrentMonth: false,
      events: events.filter((e) => isSameDay(new Date(e.date), date)),
    });
  }

  return days;
}

