/**
 * @file constants.ts
 * @brief Constants for calendar view
 */

import {
  FileText,
  GraduationCap,
  BookOpen,
  Clock,
  Lightbulb,
} from 'lucide-react';
import type { SchoolEvent } from '@/lib/stores';

export type EventType = SchoolEvent['type'];
export type Priority = SchoolEvent['priority'];

export const EVENT_TYPES: Array<{
  id: EventType;
  label: string;
  icon: React.ElementType;
  color: string;
}> = [
  {
    id: 'test',
    label: 'Verifica',
    icon: FileText,
    color: 'text-red-500 bg-red-100 dark:bg-red-900/30',
  },
  {
    id: 'exam',
    label: 'Esame',
    icon: GraduationCap,
    color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
  },
  {
    id: 'homework',
    label: 'Compiti',
    icon: BookOpen,
    color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  },
  {
    id: 'project',
    label: 'Progetto',
    icon: Lightbulb,
    color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
  },
  {
    id: 'lesson',
    label: 'Lezione',
    icon: Clock,
    color: 'text-green-500 bg-green-100 dark:bg-green-900/30',
  },
];

export const SUBJECTS = [
  'Matematica',
  'Italiano',
  'Storia',
  'Inglese',
  'Scienze',
  'Fisica',
  'Chimica',
  'Biologia',
  'Arte',
  'Filosofia',
  'Geografia',
  'Musica',
  'Latino',
  'Greco',
  'Educazione Fisica',
];

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'border-l-green-500',
  medium: 'border-l-amber-500',
  high: 'border-l-red-500',
};

