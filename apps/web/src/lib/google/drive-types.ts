/**
 * Google Drive API Types
 * ADR 0038 - Google Drive Integration
 *
 * Type definitions for Google Drive v3 API responses.
 */

// Individual file from Drive API
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string; // File size in bytes (string for large files)
  createdTime?: string;
  modifiedTime?: string;
  iconLink?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  parents?: string[];
  starred?: boolean;
  trashed?: boolean;
}

// Response from files.list endpoint
export interface DriveListResponse {
  files: DriveFile[];
  nextPageToken?: string;
  incompleteSearch?: boolean;
}

// Query parameters for listing files
export interface DriveListParams {
  pageSize?: number;
  pageToken?: string;
  q?: string; // Search query
  orderBy?: string;
  fields?: string;
  spaces?: string;
}

// File download response
export interface DriveDownloadResult {
  content: ArrayBuffer;
  mimeType: string;
  fileName: string;
  size: number;
}

// Folder navigation
export interface DriveBreadcrumb {
  id: string;
  name: string;
}

// UI-friendly file representation
export interface DriveFileUI {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  size?: number;
  modifiedAt?: Date;
  thumbnailUrl?: string;
  iconUrl?: string;
}

// File picker state
export interface DrivePickerState {
  currentFolderId: string | null;
  breadcrumbs: DriveBreadcrumb[];
  files: DriveFileUI[];
  isLoading: boolean;
  error: string | null;
  nextPageToken?: string;
  hasMore: boolean;
}

// MIME type constants
export const DRIVE_MIME_TYPES = {
  folder: 'application/vnd.google-apps.folder',
  document: 'application/vnd.google-apps.document',
  spreadsheet: 'application/vnd.google-apps.spreadsheet',
  presentation: 'application/vnd.google-apps.presentation',
  pdf: 'application/pdf',
} as const;

// Check if file is a folder
export function isFolder(file: DriveFile): boolean {
  return file.mimeType === DRIVE_MIME_TYPES.folder;
}

// Convert API response to UI format
export function toDriveFileUI(file: DriveFile): DriveFileUI {
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    isFolder: isFolder(file),
    size: file.size ? parseInt(file.size, 10) : undefined,
    modifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : undefined,
    thumbnailUrl: file.thumbnailLink,
    iconUrl: file.iconLink,
  };
}
