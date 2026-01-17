/**
 * MirrorBuddy Storage Service
 * Abstract interface for file storage operations
 *
 * All storage providers (local, Azure, S3) implement this interface.
 * Use getStorageService() to get the configured provider.
 *
 * Related: ADR-0001, #22 Storage Architecture
 */

import {
  type IStorageService,
  StorageError,
} from './types';

// Re-export types for backwards compatibility
export type { IStorageService } from './types';

// Re-export utilities for backwards compatibility
export {
  validateFile,
  generateStoragePath,
  calculateChecksum,
  toBuffer,
} from './storage-utils';

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
