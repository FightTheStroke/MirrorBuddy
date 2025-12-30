/**
 * ConvergioEdu Storage Service
 * Abstract interface for file storage operations
 *
 * All storage providers (local, Azure, S3) implement this interface.
 * Use getStorageService() to get the configured provider.
 *
 * Related: ADR-0001, #22 Storage Architecture
 */

import {
  type StoredFile,
  type UploadOptions,
  type UrlOptions,
  type ListOptions,
  type ListResult,
  type StorageConfig,
  StorageError,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from './types';

/**
 * Abstract storage service interface.
 * All providers must implement these methods.
 */
export interface IStorageService {
  /**
   * Upload a file to storage
   * @param data - File data (Buffer, Blob, or ReadableStream)
   * @param options - Upload options including type, userId, filename
   * @returns StoredFile with ID and metadata
   * @throws StorageError on failure
   */
  upload(
    data: Buffer | Blob | ReadableStream<Uint8Array>,
    options: UploadOptions
  ): Promise<StoredFile>;

  /**
   * Download a file from storage
   * @param fileId - Unique file identifier
   * @returns File data as Buffer
   * @throws StorageError if file not found
   */
  download(fileId: string): Promise<Buffer>;

  /**
   * Get a URL to access the file
   * @param fileId - Unique file identifier
   * @param options - URL generation options (expiration, download)
   * @returns URL string (may be signed for private storage)
   */
  getUrl(fileId: string, options?: UrlOptions): Promise<string>;

  /**
   * Delete a file from storage
   * @param fileId - Unique file identifier
   * @throws StorageError if file not found or delete fails
   */
  delete(fileId: string): Promise<void>;

  /**
   * List files matching criteria
   * @param options - Filter and pagination options
   * @returns List of files with pagination info
   */
  list(options?: ListOptions): Promise<ListResult>;

  /**
   * Check if a file exists
   * @param fileId - Unique file identifier
   * @returns true if file exists
   */
  exists(fileId: string): Promise<boolean>;

  /**
   * Get file metadata without downloading
   * @param fileId - Unique file identifier
   * @returns StoredFile metadata
   * @throws StorageError if file not found
   */
  getMetadata(fileId: string): Promise<StoredFile>;
}

/**
 * Validate file before upload
 */
export function validateFile(
  size: number,
  mimeType: string,
  config?: Partial<StorageConfig>
): void {
  const maxSize = config?.maxFileSize ?? MAX_FILE_SIZE;

  if (size > maxSize) {
    throw new StorageError(
      `File size ${size} exceeds maximum ${maxSize} bytes`,
      'FILE_TOO_LARGE'
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw new StorageError(
      `MIME type ${mimeType} is not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      'INVALID_MIME_TYPE'
    );
  }
}

/**
 * Generate storage path based on file type and ownership
 */
export function generateStoragePath(options: UploadOptions): string {
  const { type, userId, parentId, filename } = options;

  // Map FileType to directory
  const typeDir: Record<string, string> = {
    HOMEWORK_PHOTO: 'homework',
    MINDMAP_EXPORT: 'mindmaps',
    PDF_DOCUMENT: 'documents',
    VOICE_RECORDING: 'voice',
    AVATAR: 'avatars',
  };

  const dir = typeDir[type] ?? 'misc';

  // Generate path: {type}/{userId}/{parentId?}/{filename}
  const parts = [dir, userId];
  if (parentId) {
    parts.push(parentId);
  }

  // Add timestamp prefix to filename for uniqueness
  const timestamp = Date.now();
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  parts.push(`${timestamp}-${safeFilename}`);

  return parts.join('/');
}

/**
 * Calculate SHA-256 checksum of data
 */
export async function calculateChecksum(data: Buffer): Promise<string> {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Convert various input types to Buffer
 */
export async function toBuffer(
  data: Buffer | Blob | ReadableStream<Uint8Array>
): Promise<Buffer> {
  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (data instanceof Blob) {
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ReadableStream
  const reader = data.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return Buffer.concat(chunks);
}

// Singleton instance
let storageService: IStorageService | null = null;

/**
 * Get the configured storage service instance
 * Lazy-loads the appropriate provider based on environment
 */
export async function getStorageService(): Promise<IStorageService> {
  if (storageService) {
    return storageService;
  }

  const provider = process.env.STORAGE_PROVIDER ?? 'local';

  switch (provider) {
    case 'local': {
      const { LocalStorageProvider } = await import('./local-provider');
      storageService = new LocalStorageProvider({
        provider: 'local',
        localPath: process.env.STORAGE_LOCAL_PATH ?? './uploads',
      });
      break;
    }
    case 'azure': {
      // Azure provider will be implemented in production
      throw new StorageError(
        'Azure storage provider not yet implemented. Use STORAGE_PROVIDER=local for development.',
        'INVALID_CONFIG'
      );
    }
    case 's3': {
      // S3 provider can be added later
      throw new StorageError(
        'S3 storage provider not yet implemented. Use STORAGE_PROVIDER=local for development.',
        'INVALID_CONFIG'
      );
    }
    default:
      throw new StorageError(
        `Unknown storage provider: ${provider}. Use 'local', 'azure', or 's3'.`,
        'INVALID_CONFIG'
      );
  }

  return storageService;
}

/**
 * Reset storage service (for testing)
 */
export function resetStorageService(): void {
  storageService = null;
}
