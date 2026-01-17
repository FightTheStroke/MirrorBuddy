/**
 * Storage Utility Functions
 * Pure utility functions extracted to break circular dependency with local-provider
 */

import {
  type StorageConfig,
  type UploadOptions,
  StorageError,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from './types';

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
