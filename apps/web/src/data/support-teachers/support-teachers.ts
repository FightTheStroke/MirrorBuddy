/**
 * MirrorBuddy Support Teachers
 * Melissa and Roberto - Learning Coaches
 *
 * Part of the Support Triangle:
 * - MAESTRI: Subject experts (vertical, content-focused)
 * - COACH (this file): Learning method coach (vertical, autonomy-focused)
 * - BUDDY: Peer support (horizontal, emotional support)
 *
 * Related: #24 Melissa/Roberto Issue, ManifestoEdu.md
 */

import type { SupportTeacher } from "@/types";
import { MELISSA } from "./melissa";
import { ROBERTO } from "./roberto";
import { CHIARA } from "./chiara";
import { ANDREA } from "./andrea";
import { FAVIJ } from "./favij";
import { LAURA } from "./laura";

// ============================================================================
// TYPES
// ============================================================================

export type CoachId =
  | "melissa"
  | "roberto"
  | "chiara"
  | "andrea"
  | "favij"
  | "laura";

// ============================================================================
// SUPPORT TEACHERS MAP
// ============================================================================

/**
 * All support teachers (coaches) indexed by ID.
 */
const SUPPORT_TEACHERS: Record<CoachId, SupportTeacher> = {
  melissa: MELISSA,
  roberto: ROBERTO,
  chiara: CHIARA,
  andrea: ANDREA,
  favij: FAVIJ,
  laura: LAURA,
};

// ============================================================================
// EXPORTS
// ============================================================================

export { MELISSA, ROBERTO, CHIARA, ANDREA, FAVIJ, LAURA };

/**
 * Get a support teacher by ID.
 */
export function getSupportTeacherById(id: CoachId): SupportTeacher | undefined {
  return SUPPORT_TEACHERS[id];
}

/**
 * Get all support teachers.
 */
export function getAllSupportTeachers(): SupportTeacher[] {
  return [MELISSA, ROBERTO, CHIARA, ANDREA, FAVIJ, LAURA];
}

/**
 * Get the default support teacher (Melissa).
 */
export function getDefaultSupportTeacher(): SupportTeacher {
  return MELISSA;
}

/**
 * Get a support teacher by gender preference.
 */
export function getSupportTeacherByGender(
  gender: "male" | "female",
): SupportTeacher {
  return gender === "male" ? ROBERTO : MELISSA;
}
