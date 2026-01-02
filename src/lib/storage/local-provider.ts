/**
 * MirrorBuddy Local Storage Provider
 * Filesystem-based storage for development environment
 *
 * Stores files in local filesystem with metadata in JSON sidecar files.
 * NOT recommended for production - use Azure or S3 instead.
 *
 * Related: ADR-0001, #22 Storage Architecture
 */

import { mkdir, writeFile, readFile, unlink, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';

import {
  type IStorageService,
  validateFile,
  generateStoragePath,
  calculateChecksum,
  toBuffer,
} from './storage-service';
import {
  type StoredFile,
  type UploadOptions,
  type UrlOptions,
  type ListOptions,
  type ListResult,
  type StorageConfig,
  StorageError,
} from './types';

/**
 * Metadata file stored alongside each uploaded file
 */
interface FileMetadata {
  id: string;
  path: string;
  filename: string;
  mimeType: string;
  size: number;
  type: string;
  userId: string;
  checksum?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Local filesystem storage provider
 * Stores files in: {localPath}/{storagePath}
 * Metadata in: {localPath}/{storagePath}.meta.json
 */
export class LocalStorageProvider implements IStorageService {
  private readonly basePath: string;

  constructor(config: StorageConfig) {
    if (!config.localPath) {
      throw new StorageError('localPath is required for local storage provider', 'INVALID_CONFIG');
    }
    this.basePath = config.localPath;
  }

  /**
   * Ensure directory exists for a file path
   */
  private async ensureDir(filePath: string): Promise<void> {
    const dir = dirname(filePath);
    await mkdir(dir, { recursive: true });
  }

  /**
   * Get full filesystem path for a storage path
   */
  private getFullPath(storagePath: string): string {
    return join(this.basePath, storagePath);
  }

  /**
   * Get metadata file path
   */
  private getMetaPath(storagePath: string): string {
    return this.getFullPath(storagePath) + '.meta.json';
  }

  /**
   * Read metadata from sidecar file
   */
  private async readMetadata(storagePath: string): Promise<FileMetadata> {
    const metaPath = this.getMetaPath(storagePath);
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
  private async writeMetadata(storagePath: string, meta: FileMetadata): Promise<void> {
    const metaPath = this.getMetaPath(storagePath);
    await this.ensureDir(metaPath);
    await writeFile(metaPath, JSON.stringify(meta, null, 2));
  }

  /**
   * Convert FileMetadata to StoredFile
   */
  private toStoredFile(meta: FileMetadata): StoredFile {
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

  async upload(
    data: Buffer | Blob | ReadableStream<Uint8Array>,
    options: UploadOptions
  ): Promise<StoredFile> {
    const buffer = await toBuffer(data);

    // Validate file
    validateFile(buffer.length, options.mimeType);

    // Generate storage path and ID
    const id = randomUUID();
    const storagePath = generateStoragePath(options);
    const fullPath = this.getFullPath(storagePath);

    try {
      // Ensure directory exists
      await this.ensureDir(fullPath);

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
      await this.writeMetadata(storagePath, meta);

      return this.toStoredFile(meta);
    } catch (error) {
      throw new StorageError(
        `Failed to upload file: ${options.filename}`,
        'UPLOAD_FAILED',
        error instanceof Error ? error : undefined
      );
    }
  }

  async download(fileId: string): Promise<Buffer> {
    // Find file by ID (need to search metadata)
    const file = await this.findById(fileId);
    if (!file) {
      throw new StorageError(`File not found: ${fileId}`, 'FILE_NOT_FOUND');
    }

    try {
      const fullPath = this.getFullPath(file.path);
      return await readFile(fullPath);
    } catch (error) {
      throw new StorageError(
        `Failed to download file: ${fileId}`,
        'DOWNLOAD_FAILED',
        error instanceof Error ? error : undefined
      );
    }
  }

  async getUrl(fileId: string, options?: UrlOptions): Promise<string> {
    const file = await this.findById(fileId);
    if (!file) {
      throw new StorageError(`File not found: ${fileId}`, 'FILE_NOT_FOUND');
    }

    // For local storage, return an API route path
    // The Next.js API route will serve the file from the filesystem
    // If download is requested, add download param
    const downloadParam = options?.download ? '?download=true' : '';

    // Return API route format (to be implemented in Next.js)
    return `/api/storage/${fileId}${downloadParam}`;
  }

  async delete(fileId: string): Promise<void> {
    const file = await this.findById(fileId);
    if (!file) {
      throw new StorageError(`File not found: ${fileId}`, 'FILE_NOT_FOUND');
    }

    try {
      const fullPath = this.getFullPath(file.path);
      const metaPath = this.getMetaPath(file.path);

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

  async list(options?: ListOptions): Promise<ListResult> {
    const files: StoredFile[] = [];

    try {
      // Recursively find all .meta.json files
      const metaFiles = await this.findMetaFiles(this.basePath);

      for (const metaPath of metaFiles) {
        try {
          const content = await readFile(metaPath, 'utf-8');
          const meta: FileMetadata = JSON.parse(content);
          const storedFile = this.toStoredFile(meta);

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

  async exists(fileId: string): Promise<boolean> {
    const file = await this.findById(fileId);
    return file !== null;
  }

  async getMetadata(fileId: string): Promise<StoredFile> {
    const file = await this.findById(fileId);
    if (!file) {
      throw new StorageError(`File not found: ${fileId}`, 'FILE_NOT_FOUND');
    }
    return file;
  }

  /**
   * Find all .meta.json files recursively
   */
  private async findMetaFiles(dir: string): Promise<string[]> {
    const results: string[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          const subResults = await this.findMetaFiles(fullPath);
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
  private async findById(fileId: string): Promise<StoredFile | null> {
    const metaFiles = await this.findMetaFiles(this.basePath);

    for (const metaPath of metaFiles) {
      try {
        const content = await readFile(metaPath, 'utf-8');
        const meta: FileMetadata = JSON.parse(content);

        if (meta.id === fileId) {
          return this.toStoredFile(meta);
        }
      } catch {
        // Skip invalid files
      }
    }

    return null;
  }
}
