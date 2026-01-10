/**
 * Constants for Weekly Schedule
 */

import type { DayOfWeek } from '@/lib/scheduler/types';

export const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunedi' },
  { value: 2, label: 'Martedi' },
  { value: 3, label: 'Mercoledi' },
  { value: 4, label: 'Giovedi' },
  { value: 5, label: 'Venerdi' },
  { value: 6, label: 'Sabato' },
  { value: 0, label: 'Domenica' },
] as const;

export const SUBJECTS = [
  { value: 'matematica', label: 'Matematica' },
  { value: 'italiano', label: 'Italiano' },
  { value: 'storia', label: 'Storia' },
  { value: 'scienze', label: 'Scienze' },
  { value: 'geografia', label: 'Geografia' },
  { value: 'inglese', label: 'Inglese' },
  { value: 'arte', label: 'Arte' },
  { value: 'musica', label: 'Musica' },
  { value: 'filosofia', label: 'Filosofia' },
  { value: 'latino', label: 'Latino' },
  { value: 'altro', label: 'Altro' },
] as const;

export const TIME_OPTIONS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '14:00', '14:30', '15:00',
  '15:30', '16:00', '16:30', '17:00', '17:30', '18:00',
  '18:30', '19:00', '19:30', '20:00', '20:30', '21:00',
] as const;
