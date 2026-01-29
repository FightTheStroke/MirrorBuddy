/**
 * 🔄 Offline Sync Service
 * 
 * Manages local persistence via IndexedDB and automatic synchronization 
 * with Prisma when connectivity is restored.
 */

import { openDB, IDBPDatabase } from 'idb';
import { logger } from '@/lib/logger';

const DB_NAME = 'MirrorBuddyResearch';
const STORE_NAME = 'pendingSimulations';

export class SyncService {
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      },
    });
  }

  /**
   * Save a simulation result locally
   */
  async saveLocally(data: any) {
    const db = await this.dbPromise;
    await db.add(STORE_NAME, { ...data, createdAt: new Date() });
    logger.info("💾 Data saved to local IndexedDB (Offline Mode)");
    
    if (navigator.onLine) {
      this.sync();
    }
  }

  /**
   * Sync all pending data to the server
   */
  async sync() {
    if (!navigator.onLine) return;

    const db = await this.dbPromise;
    const allPending = await db.getAll(STORE_NAME);

    if (allPending.length === 0) return;

    logger.info(`🔄 Syncing ${allPending.length} pending items to cloud...`);

    for (const item of allPending) {
      try {
        const res = await fetch('/api/research/record', {
          method: 'POST',
          body: JSON.stringify(item),
          headers: { 'Content-Type': 'application/json' }
        });

        if (res.ok) {
          await db.delete(STORE_NAME, item.id);
        }
      } catch (err) {
        logger.error("❌ Sync failed for item", { id: item.id });
      }
    }
    
    logger.info("✅ Sync completed.");
  }
}

export const syncService = new SyncService();

// Listen for online status
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => syncService.sync());
}
