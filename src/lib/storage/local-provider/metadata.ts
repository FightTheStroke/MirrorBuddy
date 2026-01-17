/**
 * Local Provider Metadata Operations
 * Metadata read/write and helper functions
 *
 * Related: ADR-0001, #22 Storage Architecture
 */

import { mkdir, writeFile, readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import type { FileMetadata } from './types';
import type { StoredFile } from '../types';
import { StorageError } from '../types';

/**
 * Ensure directory exists for a file path
 */
export async function ensureDir(filePath: string): Promise<void> {
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
}

/**
 * Get full filesystem path for a storage path
 */
export function getFullPath(basePath: string, storagePath: string): string {
  return join(basePath, storagePath);
}

/**
 * Get metadata file path
 */
export function getMetaPath(basePath: string, storagePath: string): string {
  return getFullPath(basePath, storagePath) + '.meta.json';
}

/**
 * Read metadata from sidecar file
 */
export async function readMetadata(basePath: string, storagePath: string): Promise<FileMetadata> {
  const metaPath = getMetaPath(basePath, storagePath);
  try {
    const content = await readFile(metaPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new StorageError(
      `Failed to read metadata: ${storagePath}`,
      'FILE_NOT_FOUND',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Write metadata to sidecar file
 */
export async function writeMetadata(basePath: string, storagePath: string, meta: FileMetadata): Promise<void> {
  const metaPath = getMetaPath(basePath, storagePath);
  await ensureDir(metaPath);
  await writeFile(metaPath, JSON.stringify(meta, null, 2));
}

/**
 * Convert FileMetadata to StoredFile
 */
export function toStoredFile(meta: FileMetadata): StoredFile {
  return {
    id: meta.id,
    path: meta.path,
    filename: meta.filename,
    mimeType: meta.mimeType,
    size: meta.size,
    type: meta.type as StoredFile['type'],
    userId: meta.userId,
    checksum: meta.checksum,
    metadata: meta.metadata,
    expiresAt: meta.expiresAt ? new Date(meta.expiresAt) : undefined,
    createdAt: new Date(meta.createdAt),
    updatedAt: new Date(meta.updatedAt),
  };
}

/**
 * Find all .meta.json files recursively
 */
export async function findMetaFiles(dir: string): Promise<string[]> {
  const results: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        const subResults = await findMetaFiles(fullPath);
        results.push(...subResults);
      } else if (entry.name.endsWith('.meta.json')) {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist or not readable
  }

  return results;
}

/**
 * Find a file by its ID
 */
export async function findById(basePath: string, fileId: string): Promise<StoredFile | null> {
  const metaFiles = await findMetaFiles(basePath);

  for (const metaPath of metaFiles) {
    try {
      const content = await readFile(metaPath, 'utf-8');
      const meta: FileMetadata = JSON.parse(content);

      if (meta.id === fileId) {
        return toStoredFile(meta);
      }
    } catch {
      // Skip invalid files
    }
  }

  return null;
}
