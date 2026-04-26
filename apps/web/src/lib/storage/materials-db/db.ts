// ============================================================================
// MATERIALS DATABASE INITIALIZATION
// IndexedDB database setup
// ============================================================================

import { openDB, IDBPDatabase } from 'idb';
import type { MaterialsDB } from './types';

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

const DB_NAME = 'mirrorbuddy-materials';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<MaterialsDB> | null = null;

/**
 * Get the IndexedDB database instance
 * Creates the database if it doesn't exist
 */
export async function getMaterialsDB(): Promise<IDBPDatabase<MaterialsDB>> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser');
  }

  if (dbInstance) return dbInstance;

  dbInstance = await openDB<MaterialsDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Files store (blobs)
      db.createObjectStore('files', { keyPath: 'id' });

      // Metadata store with indexes
      const metaStore = db.createObjectStore('metadata', { keyPath: 'id' });
      metaStore.createIndex('by-date', 'createdAt');
      metaStore.createIndex('by-subject', 'subject');
      metaStore.createIndex('by-format', 'format');
    },
  });

  return dbInstance;
}
