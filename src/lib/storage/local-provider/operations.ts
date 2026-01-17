/**
 * Local Provider Operations
 * File upload, download, delete, and list operations
 *
 * Related: ADR-0001, #22 Storage Architecture
 */

import { writeFile, readFile, unlink } from 'fs/promises';
import { randomUUID } from 'crypto';
import type { FileMetadata } from './types';
import {
  ensureDir,
  getFullPath,
  writeMetadata,
  toStoredFile,
  findMetaFiles,
  findById,
} from './metadata';
import {
  type StoredFile,
  type UploadOptions,
  type UrlOptions,
  type ListOptions,
  type ListResult,
  StorageError,
} from '../types';
import {
  validateFile,
  generateStoragePath,
  calculateChecksum,
  toBuffer,
} from '../storage-service';

/**
 * Upload a file to local storage
 */
export async function uploadFile(
  basePath: string,
  data: Buffer | Blob | ReadableStream<Uint8Array>,
  options: UploadOptions
): Promise<StoredFile> {
  const buffer = await toBuffer(data);

  // Validate file
  validateFile(buffer.length, options.mimeType);

  // Generate storage path and ID
  const id = randomUUID();
  const storagePath = generateStoragePath(options);
  const fullPath = getFullPath(basePath, storagePath);

  try {
    // Ensure directory exists
    await ensureDir(fullPath);

    // Calculate checksum
    const checksum = await calculateChecksum(buffer);

    // Write file
    await writeFile(fullPath, buffer);

    // Create metadata
    const now = new Date().toISOString();
    const meta: FileMetadata = {
      id,
      path: storagePath,
      filename: options.filename,
      mimeType: options.mimeType,
      size: buffer.length,
      type: options.type,
      userId: options.userId,
      checksum,
      metadata: options.metadata,
      expiresAt: options.expiresAt?.toISOString(),
      createdAt: now,
      updatedAt: now,
    };

    // Write metadata sidecar
    await writeMetadata(basePath, storagePath, meta);

    return toStoredFile(meta);
  } catch (error) {
    throw new StorageError(
      `Failed to upload file: ${options.filename}`,
      'UPLOAD_FAILED',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Download a file from local storage
 */
export async function downloadFile(basePath: string, fileId: string): Promise<Buffer> {
  const file = await findById(basePath, fileId);
  if (!file) {
    throw new StorageError(`File not found: ${fileId}`, 'FILE_NOT_FOUND');
  }

  try {
    const fullPath = getFullPath(basePath, file.path);
    return await readFile(fullPath);
  } catch (error) {
    throw new StorageError(
      `Failed to download file: ${fileId}`,
      'DOWNLOAD_FAILED',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get URL for a file
 */
export async function getFileUrl(basePath: string, fileId: string, options?: UrlOptions): Promise<string> {
  const file = await findById(basePath, fileId);
  if (!file) {
    throw new StorageError(`File not found: ${fileId}`, 'FILE_NOT_FOUND');
  }

  // For local storage, return an API route path
  const downloadParam = options?.download ? '?download=true' : '';
  return `/api/storage/${fileId}${downloadParam}`;
}

/**
 * Delete a file from local storage
 */
export async function deleteFile(basePath: string, fileId: string): Promise<void> {
  const file = await findById(basePath, fileId);
  if (!file) {
    throw new StorageError(`File not found: ${fileId}`, 'FILE_NOT_FOUND');
  }

  try {
    const fullPath = getFullPath(basePath, file.path);
    const metaPath = getFullPath(basePath, file.path) + '.meta.json';

    // Delete both file and metadata
    await unlink(fullPath);
    await unlink(metaPath);
  } catch (error) {
    throw new StorageError(
      `Failed to delete file: ${fileId}`,
      'DELETE_FAILED',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * List files in local storage
 */
export async function listFiles(basePath: string, options?: ListOptions): Promise<ListResult> {
  const files: StoredFile[] = [];

  try {
    const metaFiles = await findMetaFiles(basePath);

    for (const metaPath of metaFiles) {
      try {
        const content = await readFile(metaPath, 'utf-8');
        const meta: FileMetadata = JSON.parse(content);
        const storedFile = toStoredFile(meta);

        // Apply filters
        if (options?.type && storedFile.type !== options.type) continue;
        if (options?.userId && storedFile.userId !== options.userId) continue;
        if (options?.prefix && !storedFile.path.startsWith(options.prefix)) continue;

        files.push(storedFile);
      } catch {
        // Skip invalid metadata files
      }
    }

    // Sort by creation date (newest first)
    files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply limit
    const limit = options?.limit ?? 100;
    const limited = files.slice(0, limit);

    return {
      files: limited,
      total: files.length,
      nextCursor: files.length > limit ? String(limit) : undefined,
    };
  } catch (error) {
    throw new StorageError(
      'Failed to list files',
      'PROVIDER_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(basePath: string, fileId: string): Promise<boolean> {
  const file = await findById(basePath, fileId);
  return file !== null;
}

/**
 * Get file metadata
 */
export async function getFileMetadata(basePath: string, fileId: string): Promise<StoredFile> {
  const file = await findById(basePath, fileId);
  if (!file) {
    throw new StorageError(`File not found: ${fileId}`, 'FILE_NOT_FOUND');
  }
  return file;
}
