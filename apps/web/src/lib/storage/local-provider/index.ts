/**
 * MirrorBuddy Local Storage Provider
 * Filesystem-based storage for development environment
 *
 * Stores files in local filesystem with metadata in JSON sidecar files.
 * NOT recommended for production - use Azure or S3 instead.
 *
 * Related: ADR-0001, #22 Storage Architecture
 */

import type {
  IStorageService,
  StoredFile,
  UploadOptions,
  UrlOptions,
  ListOptions,
  ListResult,
  StorageConfig,
} from '../types';
import { StorageError } from '../types';
import {
  uploadFile,
  downloadFile,
  getFileUrl,
  deleteFile,
  listFiles,
  fileExists,
  getFileMetadata,
} from './operations';

// Re-export types
export type { FileMetadata } from './types';

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

  async upload(
    data: Buffer | Blob | ReadableStream<Uint8Array>,
    options: UploadOptions
  ): Promise<StoredFile> {
    return uploadFile(this.basePath, data, options);
  }

  async download(fileId: string): Promise<Buffer> {
    return downloadFile(this.basePath, fileId);
  }

  async getUrl(fileId: string, options?: UrlOptions): Promise<string> {
    return getFileUrl(this.basePath, fileId, options);
  }

  async delete(fileId: string): Promise<void> {
    return deleteFile(this.basePath, fileId);
  }

  async list(options?: ListOptions): Promise<ListResult> {
    return listFiles(this.basePath, options);
  }

  async exists(fileId: string): Promise<boolean> {
    return fileExists(this.basePath, fileId);
  }

  async getMetadata(fileId: string): Promise<StoredFile> {
    return getFileMetadata(this.basePath, fileId);
  }
}
