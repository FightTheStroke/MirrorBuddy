/**
 * Character selection functions.
 * Handles selecting the right character based on student preferences and subject.
 */

import type { Subject, ExtendedStudentProfile } from '@/types';
import type { MaestroFull } from '@/data/maestri';
import type { SupportTeacher, BuddyProfile } from '@/types';
import type { BuddyId } from '@/data/buddy-profiles';
import { getMaestroById, getMaestriBySubject } from '@/data/maestri';
import {
  getSupportTeacherById,
  getDefaultSupportTeacher,
} from '@/data/support-teachers';
import {
  getBuddyById,
  getDefaultBuddy,
} from '@/data/buddy-profiles';
import { DEFAULT_MAESTRO_BY_SUBJECT } from './constants';

/**
 * Gets the appropriate Maestro for a subject.
 */
export function getMaestroForSubject(subject: Subject): MaestroFull | undefined {
  const defaultId = DEFAULT_MAESTRO_BY_SUBJECT[subject];
  if (defaultId) {
    const maestro = getMaestroById(defaultId);
    if (maestro) return maestro;
  }

  // Fallback: get first Maestro for this subject
  const maestri = getMaestriBySubject(subject);
  return maestri[0];
}

/**
 * Gets the appropriate Coach based on student preferences.
 */
export function getCoachForStudent(
  profile: ExtendedStudentProfile
): SupportTeacher {
  if (profile.preferredCoach) {
    const preferred = getSupportTeacherById(profile.preferredCoach);
    if (preferred) {
      return preferred;
    }
  }

  // No preference: use default (Melissa)
  return getDefaultSupportTeacher();
}

/**
 * Gets the appropriate Buddy based on student preferences.
 */
export function getBuddyForStudent(
  profile: ExtendedStudentProfile
): BuddyProfile {
  if (profile.preferredBuddy) {
    const preferred = getBuddyById(profile.preferredBuddy);
    if (preferred) {
      return preferred;
    }
  }

  // No preference: use default (Mario)
  return getDefaultBuddy();
}

/**
 * Gets the current character instance from character type and ID.
 */
export function getCurrentCharacter(
  type: 'maestro' | 'coach' | 'buddy',
  id: string
): MaestroFull | SupportTeacher | BuddyProfile | undefined {
  switch (type) {
    case 'maestro':
      return getMaestroById(id);
    case 'coach':
      return getSupportTeacherById(id as 'melissa' | 'roberto');
    case 'buddy':
      return getBuddyById(id as BuddyId);
  }
}
