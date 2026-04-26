/**
 * Calendar view utility functions and constants
 */

import type { KnowledgeHubMaterial } from './explorer-view';
import type { Material } from '../components/material-card';

export const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
export const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  materials: KnowledgeHubMaterial[];
}

/**
 * Convert KnowledgeHubMaterial to Material for MaterialCard
 */
export function toMaterial(m: KnowledgeHubMaterial): Material {
  const createdAt = m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt);
  const updatedAt = m.updatedAt
    ? (m.updatedAt instanceof Date ? m.updatedAt : new Date(m.updatedAt))
    : createdAt;
  return {
    id: m.id,
    title: m.title,
    type: m.toolType,
    createdAt,
    updatedAt,
    collectionId: m.collectionId,
    isFavorite: m.isFavorite,
    isArchived: m.isArchived,
    tags: m.tags,
  };
}

/**
 * Get calendar days for a month
 */
export function getCalendarDays(
  year: number,
  month: number,
  materials: KnowledgeHubMaterial[]
): CalendarDay[] {
  const days: CalendarDay[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Map materials by date key
  const materialsByDate = new Map<string, KnowledgeHubMaterial[]>();
  materials.forEach((m) => {
    const d = new Date(m.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!materialsByDate.has(key)) {
      materialsByDate.set(key, []);
    }
    materialsByDate.get(key)!.push(m);
  });

  // Start from Monday of the week containing the first day
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  // Days from previous month
  for (let i = startOffset - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    days.push({
      date,
      isCurrentMonth: false,
      isToday: date.getTime() === today.getTime(),
      materials: materialsByDate.get(key) || [],
    });
  }

  // Days of current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    days.push({
      date,
      isCurrentMonth: true,
      isToday: date.getTime() === today.getTime(),
      materials: materialsByDate.get(key) || [],
    });
  }

  // Fill remaining days from next month to complete 6 rows
  while (days.length < 42) {
    const lastDate = days[days.length - 1].date;
    const date = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + 1);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    days.push({
      date,
      isCurrentMonth: false,
      isToday: date.getTime() === today.getTime(),
      materials: materialsByDate.get(key) || [],
    });
  }

  return days;
}
