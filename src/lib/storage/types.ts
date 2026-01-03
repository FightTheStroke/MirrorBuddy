/**
 * MirrorBuddy Storage Types
 * Type definitions for the storage service abstraction
 *
 * Related: ADR-0001, #22 Storage Architecture
 */

/**
 * Supported file types in the storage system
 */
export type FileType =
  | 'HOMEWORK_PHOTO'
  | 'MINDMAP_EXPORT'
  | 'PDF_DOCUMENT'
  | 'VOICE_RECORDING'
  | 'AVATAR';

/**
 * MIME types allowed for upload
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Maximum file size in bytes (default 10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Options for uploading a file
 */
export interface UploadOptions {
  /** File type category */
  type: FileType;
  /** User ID who owns the file */
  userId: string;
  /** Original filename */
  filename: string;
  /** MIME type of the file */
  mimeType: string;
  /** Optional parent ID (e.g., homework ID, mindmap ID) */
  parentId?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
  /** Auto-expire after this date */
  expiresAt?: Date;
}

/**
 * Result of a successful upload
 */
export interface StoredFile {
  /** Unique file ID */
  id: string;
  /** Storage path */
  path: string;
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** File type category */
  type: FileType;
  /** Owner user ID */
  userId: string;
  /** SHA-256 checksum */
  checksum?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Expiration date */
  expiresAt?: Date;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Options for generating a URL
 */
export interface UrlOptions {
  /** Expiration time in seconds (for signed URLs) */
  expiresIn?: number;
  /** Force download vs inline display */
  download?: boolean;
}

/**
 * Options for listing files
 */
export interface ListOptions {
  /** Filter by file type */
  type?: FileType;
  /** Filter by user ID */
  userId?: string;
  /** Filter by path prefix */
  prefix?: string;
  /** Maximum number of results */
  limit?: number;
  /** Pagination cursor */
  cursor?: string;
}

/**
 * Result of listing files
 */
export interface ListResult {
  /** Files matching the query */
  files: StoredFile[];
  /** Cursor for next page (if more results exist) */
  nextCursor?: string;
  /** Total count (if available) */
  total?: number;
}

/**
 * Storage provider configuration
 */
export interface StorageConfig {
  /** Provider type */
  provider: 'local' | 'azure' | 's3';
  /** Local storage path (for local provider) */
  localPath?: string;
  /** Azure connection string or account details */
  azureConnectionString?: string;
  azureAccountName?: string;
  azureAccountKey?: string;
  azureContainerName?: string;
  /** S3 configuration */
  s3Endpoint?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  s3Bucket?: string;
  s3Region?: string;
  /** CDN base URL (optional) */
  cdnBaseUrl?: string;
  /** Maximum file size override */
  maxFileSize?: number;
}

/**
 * Storage service error
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: StorageErrorCode,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export type StorageErrorCode =
  | 'FILE_NOT_FOUND'
  | 'FILE_TOO_LARGE'
  | 'INVALID_MIME_TYPE'
  | 'UPLOAD_FAILED'
  | 'DOWNLOAD_FAILED'
  | 'DELETE_FAILED'
  | 'PERMISSION_DENIED'
  | 'PROVIDER_ERROR'
  | 'INVALID_CONFIG';
