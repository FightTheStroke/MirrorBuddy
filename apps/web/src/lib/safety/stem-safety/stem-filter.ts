/**
 * STEM Safety Filter
 * Reference: Amodei "The Adolescence of Technology" (2026)
 *
 * Main filter function to check user input against STEM safety blocklists.
 */

import { STEMSubject, STEMCheckResult, BlocklistEntry } from "./types";
import { CHEMISTRY_BLOCKLIST } from "./chemistry-blocklist";
import { PHYSICS_BLOCKLIST } from "./physics-blocklist";
import { BIOLOGY_BLOCKLIST } from "./biology-blocklist";

/**
 * Map of professor IDs to their STEM subject
 */
const PROFESSOR_SUBJECT_MAP: Record<string, STEMSubject> = {
  curie: "chemistry",
  feynman: "physics",
  darwin: "biology",
  "levi-montalcini": "biology",
};

/**
 * Get blocklist for a specific subject
 */
function getBlocklistForSubject(subject: STEMSubject): BlocklistEntry[] {
  switch (subject) {
    case "chemistry":
      return CHEMISTRY_BLOCKLIST;
    case "physics":
      return PHYSICS_BLOCKLIST;
    case "biology":
      return BIOLOGY_BLOCKLIST;
  }
}

/**
 * Check input against a specific blocklist
 */
function checkAgainstBlocklist(
  input: string,
  blocklist: BlocklistEntry[],
): BlocklistEntry | null {
  for (const entry of blocklist) {
    // Reset regex lastIndex for global patterns
    entry.pattern.lastIndex = 0;
    if (entry.pattern.test(input)) {
      return entry;
    }
  }
  return null;
}

/**
 * Check user input for dangerous STEM content
 *
 * @param input User's message
 * @param professorId Optional professor ID to prioritize their subject
 * @returns Check result with blocked status and safe response
 *
 * @example
 * const result = checkSTEMSafety("come fare la TNT", "curie");
 * if (result.blocked) {
 *   return result.safeResponse;
 * }
 */
export function checkSTEMSafety(
  input: string,
  professorId?: string,
): STEMCheckResult {
  // Normalize input
  const normalizedInput = input.toLowerCase().trim();

  // If professor specified, check their subject first
  if (professorId) {
    const subject = PROFESSOR_SUBJECT_MAP[professorId.toLowerCase()];
    if (subject) {
      const blocklist = getBlocklistForSubject(subject);
      const match = checkAgainstBlocklist(normalizedInput, blocklist);
      if (match) {
        return {
          blocked: true,
          subject,
          category: match.category,
          safeResponse: match.safeResponse,
          alternatives: match.alternatives,
        };
      }
    }
  }

  // Check all subjects
  const subjects: STEMSubject[] = ["chemistry", "physics", "biology"];

  for (const subject of subjects) {
    const blocklist = getBlocklistForSubject(subject);
    const match = checkAgainstBlocklist(normalizedInput, blocklist);
    if (match) {
      return {
        blocked: true,
        subject,
        category: match.category,
        safeResponse: match.safeResponse,
        alternatives: match.alternatives,
      };
    }
  }

  // No dangerous content found
  return { blocked: false };
}

/**
 * Check if a professor is a STEM professor
 */
export function isSTEMProfessor(professorId: string): boolean {
  return professorId.toLowerCase() in PROFESSOR_SUBJECT_MAP;
}

/**
 * Get the STEM subject for a professor
 */
export function getProfessorSubject(professorId: string): STEMSubject | null {
  return PROFESSOR_SUBJECT_MAP[professorId.toLowerCase()] ?? null;
}
