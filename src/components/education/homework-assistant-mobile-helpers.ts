/**
 * Homework Assistant Mobile - Helper Functions
 *
 * Validation and constants for homework assistant component
 */

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const VALID_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const SUBJECTS = [
  "Matematica",
  "Scienze",
  "Italiano",
  "Inglese",
  "Storia",
  "Geografia",
  "Filosofia",
  "Chimica",
  "Fisica",
];

/**
 * Validates file type and size
 * @returns null if valid, error message otherwise
 */
export function getValidationError(file: File): string | null {
  if (!file) return "Please select a file";

  // Check file type
  if (!VALID_FILE_TYPES.includes(file.type)) {
    return "Invalid file type. Please use JPEG, PNG, WebP, or PDF.";
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Maximum size is 50MB.`;
  }

  return null;
}
