/**
 * Types for Teacher Diary component
 */

import type { ObservationCategory } from '@/types';

export interface DiaryEntry {
  id: string;
  maestroId: string;
  maestroName: string;
  subject: string;
  category: ObservationCategory;
  observation: string;
  isStrength: boolean;
  confidence: number;
  occurrences: number;
  createdAt: Date;
  lastSeen: Date;
}

export interface TeacherDiaryProps {
  entries: DiaryEntry[];
  studentName: string;
  isLoading?: boolean;
  onTalkToMaestro?: (maestroId: string, maestroName: string) => void;
}
