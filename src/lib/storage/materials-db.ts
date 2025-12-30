// ============================================================================
// MATERIALS DATABASE
// IndexedDB storage for client-side tool materials (mindmaps, quizzes, etc.)
// Uses the idb library for a Promise-based IndexedDB API
// ============================================================================

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { ToolType, ToolExecutionResult } from '@/types/tools';

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

interface MaterialRecord {
  toolId: string;
  toolType: ToolType;
  data: unknown;
  maestroId?: string;
  conversationId?: string;
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
  status: 'active' | 'archived' | 'deleted';
}

interface MaterialsDBSchema extends DBSchema {
  materials: {
    key: string; // toolId
    value: MaterialRecord;
    indexes: {
      'by-type': ToolType;
      'by-maestro': string;
      'by-conversation': string;
      'by-created': Date;
      'by-status': string;
    };
  };
}

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

const DB_NAME = 'convergio-materials';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MaterialsDBSchema>> | null = null;

/**
 * Get the IndexedDB database instance
 * Creates the database if it doesn't exist
 */
async function getDB(): Promise<IDBPDatabase<MaterialsDBSchema>> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser');
  }

  if (!dbPromise) {
    dbPromise = openDB<MaterialsDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create materials object store
        const store = db.createObjectStore('materials', {
          keyPath: 'toolId',
        });

        // Create indexes for efficient queries
        store.createIndex('by-type', 'toolType');
        store.createIndex('by-maestro', 'maestroId');
        store.createIndex('by-conversation', 'conversationId');
        store.createIndex('by-created', 'createdAt');
        store.createIndex('by-status', 'status');
      },
    });
  }

  return dbPromise;
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Save a tool result to IndexedDB
 */
export async function saveMaterial(
  result: ToolExecutionResult,
  context?: { maestroId?: string; conversationId?: string }
): Promise<void> {
  if (!result.success || !result.data) {
    throw new Error('Cannot save failed or empty tool result');
  }

  const db = await getDB();
  const now = new Date();

  const record: MaterialRecord = {
    toolId: result.toolId,
    toolType: result.toolType,
    data: result.data,
    maestroId: context?.maestroId,
    conversationId: context?.conversationId,
    createdAt: now,
    updatedAt: now,
    status: 'active',
  };

  await db.put('materials', record);
}

/**
 * Get a material by toolId
 */
export async function getMaterial(toolId: string): Promise<MaterialRecord | undefined> {
  const db = await getDB();
  return db.get('materials', toolId);
}

/**
 * Get all materials of a specific type
 */
export async function getMaterialsByType(toolType: ToolType): Promise<MaterialRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex('materials', 'by-type', toolType);
}

/**
 * Get all materials for a specific maestro
 */
export async function getMaterialsByMaestro(maestroId: string): Promise<MaterialRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex('materials', 'by-maestro', maestroId);
}

/**
 * Get all materials for a specific conversation
 */
export async function getMaterialsByConversation(conversationId: string): Promise<MaterialRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex('materials', 'by-conversation', conversationId);
}

/**
 * Get all active materials
 */
export async function getActiveMaterials(): Promise<MaterialRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex('materials', 'by-status', 'active');
}

/**
 * Get recent materials (last N)
 */
export async function getRecentMaterials(limit: number = 10): Promise<MaterialRecord[]> {
  const db = await getDB();
  const tx = db.transaction('materials', 'readonly');
  const index = tx.store.index('by-created');

  const materials: MaterialRecord[] = [];
  let cursor = await index.openCursor(null, 'prev'); // descending order

  while (cursor && materials.length < limit) {
    if (cursor.value.status === 'active') {
      materials.push(cursor.value);
    }
    cursor = await cursor.continue();
  }

  return materials;
}

/**
 * Update a material's data
 */
export async function updateMaterial(
  toolId: string,
  data: Partial<Pick<MaterialRecord, 'data' | 'status'>>
): Promise<void> {
  const db = await getDB();
  const existing = await db.get('materials', toolId);

  if (!existing) {
    throw new Error(`Material not found: ${toolId}`);
  }

  const updated: MaterialRecord = {
    ...existing,
    ...data,
    updatedAt: new Date(),
  };

  await db.put('materials', updated);
}

/**
 * Archive a material (soft delete)
 */
export async function archiveMaterial(toolId: string): Promise<void> {
  await updateMaterial(toolId, { status: 'archived' });
}

/**
 * Delete a material permanently
 */
export async function deleteMaterial(toolId: string): Promise<void> {
  const db = await getDB();
  await db.delete('materials', toolId);
}

/**
 * Mark a material as synced with server
 */
export async function markMaterialSynced(toolId: string): Promise<void> {
  const db = await getDB();
  const existing = await db.get('materials', toolId);

  if (!existing) {
    throw new Error(`Material not found: ${toolId}`);
  }

  const updated: MaterialRecord = {
    ...existing,
    syncedAt: new Date(),
  };

  await db.put('materials', updated);
}

/**
 * Get materials that need to be synced with server
 */
export async function getUnsyncedMaterials(): Promise<MaterialRecord[]> {
  const db = await getDB();
  const all = await db.getAll('materials');
  return all.filter((m) => !m.syncedAt && m.status === 'active');
}

// ============================================================================
// CLEANUP OPERATIONS
// ============================================================================

/**
 * Delete all archived materials older than specified days
 */
export async function cleanupArchivedMaterials(olderThanDays: number = 30): Promise<number> {
  const db = await getDB();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const tx = db.transaction('materials', 'readwrite');
  const index = tx.store.index('by-status');

  let deletedCount = 0;
  let cursor = await index.openCursor('archived');

  while (cursor) {
    if (cursor.value.updatedAt < cutoffDate) {
      await cursor.delete();
      deletedCount++;
    }
    cursor = await cursor.continue();
  }

  await tx.done;
  return deletedCount;
}

/**
 * Clear all materials (for testing or reset)
 */
export async function clearAllMaterials(): Promise<void> {
  const db = await getDB();
  await db.clear('materials');
}

/**
 * Get database statistics
 */
export async function getMaterialsStats(): Promise<{
  total: number;
  active: number;
  archived: number;
  byType: Record<string, number>;
}> {
  const db = await getDB();
  const all = await db.getAll('materials');

  const stats = {
    total: all.length,
    active: 0,
    archived: 0,
    byType: {} as Record<string, number>,
  };

  for (const material of all) {
    if (material.status === 'active') {
      stats.active++;
    } else if (material.status === 'archived') {
      stats.archived++;
    }

    stats.byType[material.toolType] = (stats.byType[material.toolType] || 0) + 1;
  }

  return stats;
}

// ============================================================================
// EXPORT
// ============================================================================

export type { MaterialRecord };
