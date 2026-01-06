/**
 * MirrorBuddy Buddy Profiles
 * Mario, Noemi, Enea, Bruno, Sofia - Peer Support Characters
 *
 * Part of the Support Triangle:
 * - MAESTRI: Subject experts (vertical, content-focused)
 * - COACH: Learning method coach (vertical, autonomy-focused)
 * - BUDDY (this file): Peer support (horizontal, emotional support)
 *
 * Key concept: MirrorBuddy MIRRORS the student:
 * - Same learning differences
 * - One year older (relatable but slightly experienced)
 * - Shares struggles and successes as a PEER
 *
 * Related: #24 MirrorBuddy Issue, ManifestoEdu.md
 */

import type { BuddyProfile } from '@/types';
import { MARIO } from './mario';
import { NOEMI } from './noemi';
import { ENEA } from './enea';
import { BRUNO } from './bruno';
import { SOFIA } from './sofia';

// ============================================================================
// TYPES
// ============================================================================

export type BuddyId = 'mario' | 'noemi' | 'enea' | 'bruno' | 'sofia';

// ============================================================================
// BUDDY PROFILES MAP
// ============================================================================

/**
 * All buddy profiles indexed by ID.
 */
const BUDDY_PROFILES: Record<BuddyId, BuddyProfile> = {
  mario: MARIO,
  noemi: NOEMI,
  enea: ENEA,
  bruno: BRUNO,
  sofia: SOFIA,
};

// ============================================================================
// EXPORTS
// ============================================================================

export { MARIO, NOEMI, ENEA, BRUNO, SOFIA };

/**
 * Get a buddy profile by ID.
 */
export function getBuddyById(id: BuddyId): BuddyProfile | undefined {
  return BUDDY_PROFILES[id];
}

/**
 * Get all buddy profiles.
 */
export function getAllBuddies(): BuddyProfile[] {
  return [MARIO, NOEMI, ENEA, BRUNO, SOFIA];
}

/**
 * Get the default buddy (Mario).
 */
export function getDefaultBuddy(): BuddyProfile {
  return MARIO;
}

/**
 * Get a buddy by gender preference.
 */
export function getBuddyByGender(gender: 'male' | 'female'): BuddyProfile {
  return gender === 'female' ? NOEMI : MARIO;
}
