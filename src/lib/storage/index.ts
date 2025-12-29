/**
 * ConvergioEdu Storage Module
 * Provider-agnostic file storage abstraction
 *
 * Usage:
 * ```typescript
 * import { getStorageService, type StoredFile } from '@/lib/storage';
 *
 * const storage = await getStorageService();
 * const file = await storage.upload(buffer, {
 *   type: 'HOMEWORK_PHOTO',
 *   userId: 'user123',
 *   filename: 'homework.jpg',
 *   mimeType: 'image/jpeg',
 * });
 * ```
 *
 * Related: ADR-0001, #22 Storage Architecture
 */

// Types
export type {
  FileType,
  AllowedMimeType,
  UploadOptions,
  StoredFile,
  UrlOptions,
  ListOptions,
  ListResult,
  StorageConfig,
  StorageErrorCode,
} from './types';

export { StorageError, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './types';

// Service interface and utilities
export type { IStorageService } from './storage-service';
export {
  validateFile,
  generateStoragePath,
  calculateChecksum,
  toBuffer,
  getStorageService,
  resetStorageService,
} from './storage-service';

// Providers (direct import if needed for testing)
export { LocalStorageProvider } from './local-provider';
