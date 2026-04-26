/**
 * Helper utilities for PdfInputMobile component
 */

const VALID_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export function isValidFileType(file: File): boolean {
  return VALID_FILE_TYPES.includes(file.type);
}

export function getValidationError(file: File): string | null {
  if (!isValidFileType(file)) {
    return "Please select a PDF or image file";
  }
  return null;
}

export interface UploadProgress {
  isUploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

export const INITIAL_UPLOAD_STATE: UploadProgress = {
  isUploading: false,
  progress: 0,
  error: null,
  success: false,
};
