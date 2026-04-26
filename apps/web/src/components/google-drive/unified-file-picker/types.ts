/**
 * UnifiedFilePicker Types
 * ADR 0038 - Google Drive Integration
 */

import type { DriveFileUI } from '@/lib/google';

export type FileSource = 'local' | 'google-drive';

export interface SelectedFile {
  source: FileSource;
  file?: File;
  driveFile?: DriveFileUI;
  name: string;
  size?: number;
  mimeType: string;
}

export interface UnifiedFilePickerProps {
  userId: string;
  onFileSelect: (file: SelectedFile) => void;
  onFileDownload?: (fileId: string) => Promise<Blob>;
  accept?: string;
  acceptedMimeTypes?: string[];
  maxSizeMB?: number;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  useNativePicker?: boolean;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
