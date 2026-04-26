/**
 * @file types.ts
 * @brief Types for support teachers
 */

import type { SupportTeacher } from '@/types';

export type CoachId = 'melissa' | 'roberto' | 'chiara' | 'andrea' | 'favij';

export interface SupportTeachersMap {
  melissa: SupportTeacher;
  roberto: SupportTeacher;
  chiara: SupportTeacher;
  andrea: SupportTeacher;
  favij: SupportTeacher;
}

