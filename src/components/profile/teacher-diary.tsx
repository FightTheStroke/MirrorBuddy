/**
 * Teacher Diary - Legacy entry point
 * This file maintains backwards compatibility. The component is now split
 * into modules in the teacher-diary/ directory.
 * See: src/components/profile/teacher-diary/
 */

export {
  TeacherDiary,
  DiaryEntryCard,
  TeacherDiaryFilters,
  useUniqueMaestri,
  useUniqueSubjects,
  useFilteredEntries,
  useGroupedByDate,
  type DiaryEntry,
  type TeacherDiaryProps,
} from './teacher-diary/index';

export { TeacherDiary as default } from './teacher-diary/index';
