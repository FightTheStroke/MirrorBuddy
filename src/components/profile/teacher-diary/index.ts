/**
 * Teacher Diary - Barrel export
 * Exports main component and types for backwards compatibility
 */

export { TeacherDiary } from './main';
export { DiaryEntryCard } from './diary-entry-card';
export { TeacherDiaryFilters } from './filters';
export {
  useUniqueMaestri,
  useUniqueSubjects,
  useFilteredEntries,
  useGroupedByDate,
} from './hooks';

export type { DiaryEntry, TeacherDiaryProps } from './types';
