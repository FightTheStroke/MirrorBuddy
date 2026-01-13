// ============================================================================
// MATERIALS DATABASE
// IndexedDB storage for uploaded files (webcam photos, PDFs)
// Uses the idb library for a Promise-based IndexedDB API
// Issue #22: Materials Archive - Storage (IndexedDB)
// ============================================================================

import { openDB, IDBPDatabase } from 'idb';
import { logger } from '@/lib/logger';
import type { ToolType } from '@/types/tools';
import type { MaterialsDB, MaterialMetadata, MaterialFile } from './materials-db/types';

export type { MaterialsDB, MaterialMetadata, MaterialFile };

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

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Save a file (webcam photo or PDF) to IndexedDB
 */
export async function saveMaterial(
  file: Blob,
  metadata: Omit<MaterialsDB['metadata']['value'], 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = await getMaterialsDB();
  const id = crypto.randomUUID();
  const now = new Date();

  // Generate thumbnail for images
  let thumbnail: Blob | undefined;
  if (metadata.format === 'image') {
    thumbnail = await generateThumbnail(file);
  }

  // Save file blob
  await db.put('files', {
    id,
    blob: file,
    thumbnail,
    createdAt: now.getTime(),
  });

  // Save metadata
  await db.put('metadata', {
    ...metadata,
    id,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

/**
 * Get all materials with optional filtering
 */
export async function getMaterials(filter?: {
  subject?: string;
  format?: 'image' | 'pdf';
  limit?: number;
}): Promise<Array<MaterialsDB['metadata']['value']>> {
  const db = await getMaterialsDB();
  let results = await db.getAll('metadata');

  // Apply filters
  if (filter?.subject) {
    results = results.filter((m) => m.subject === filter.subject);
  }
  if (filter?.format) {
    results = results.filter((m) => m.format === filter.format);
  }

  // Sort by date descending (most recent first)
  results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Apply limit
  if (filter?.limit) {
    results = results.slice(0, filter.limit);
  }

  return results;
}

/**
 * Get a material's file blob by ID
 */
export async function getMaterialFile(id: string): Promise<Blob | undefined> {
  const db = await getMaterialsDB();
  const file = await db.get('files', id);
  return file?.blob;
}

/**
 * Get a material's thumbnail by ID
 */
export async function getMaterialThumbnail(id: string): Promise<Blob | undefined> {
  const db = await getMaterialsDB();
  const file = await db.get('files', id);
  return file?.thumbnail;
}

/**
 * Get material metadata by ID
 */
export async function getMaterialMetadata(
  id: string
): Promise<MaterialsDB['metadata']['value'] | undefined> {
  const db = await getMaterialsDB();
  return db.get('metadata', id);
}

/**
 * Update material metadata (e.g., after subject detection)
 */
export async function updateMaterialMetadata(
  id: string,
  updates: Partial<Pick<MaterialsDB['metadata']['value'], 'subject' | 'maestroId' | 'pageCount'>>
): Promise<void> {
  const db = await getMaterialsDB();
  const existing = await db.get('metadata', id);

  if (!existing) {
    throw new Error(`Material not found: ${id}`);
  }

  await db.put('metadata', {
    ...existing,
    ...updates,
    updatedAt: new Date(),
  });
}

/**
 * Delete a material (both file and metadata)
 */
export async function deleteMaterial(id: string): Promise<void> {
  const db = await getMaterialsDB();
  await db.delete('files', id);
  await db.delete('metadata', id);
}

/**
 * Get materials by subject
 */
export async function getMaterialsBySubject(
  subject: string
): Promise<Array<MaterialsDB['metadata']['value']>> {
  const db = await getMaterialsDB();
  return db.getAllFromIndex('metadata', 'by-subject', subject);
}

/**
 * Get materials by format (image or pdf)
 */
export async function getMaterialsByFormat(
  format: 'image' | 'pdf'
): Promise<Array<MaterialsDB['metadata']['value']>> {
  const db = await getMaterialsDB();
  return db.getAllFromIndex('metadata', 'by-format', format);
}

/**
 * Get recent materials
 */
export async function getRecentMaterials(
  limit: number = 10
): Promise<Array<MaterialsDB['metadata']['value']>> {
  return getMaterials({ limit });
}

// ============================================================================
// CLEANUP OPERATIONS
// ============================================================================

/**
 * Delete all materials
 */
export async function clearAllMaterials(): Promise<void> {
  const db = await getMaterialsDB();
  await db.clear('files');
  await db.clear('metadata');
}

/**
 * Get storage statistics
 */
export async function getMaterialsStats(): Promise<{
  total: number;
  images: number;
  pdfs: number;
  totalSize: number;
  bySubject: Record<string, number>;
}> {
  const db = await getMaterialsDB();
  const all = await db.getAll('metadata');

  const stats = {
    total: all.length,
    images: 0,
    pdfs: 0,
    totalSize: 0,
    bySubject: {} as Record<string, number>,
  };

  for (const material of all) {
    if (material.format === 'image') {
      stats.images++;
    } else if (material.format === 'pdf') {
      stats.pdfs++;
    }

    stats.totalSize += material.size;

    if (material.subject) {
      stats.bySubject[material.subject] = (stats.bySubject[material.subject] || 0) + 1;
    }
  }

  return stats;
}

// ============================================================================
// THUMBNAIL GENERATION
// ============================================================================

/**
 * Generate a thumbnail for an image blob
 */
async function generateThumbnail(blob: Blob, maxSize = 200): Promise<Blob> {
  // Server-side check
  if (typeof window === 'undefined') {
    return blob;
  }

  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(blob);
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (thumbBlob) => {
          URL.revokeObjectURL(img.src);
          resolve(thumbBlob || blob);
        },
        'image/jpeg',
        0.7
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(blob);
    };

    img.src = URL.createObjectURL(blob);
  });
}

// ============================================================================
// TYPES EXPORT
// ============================================================================

// MaterialMetadata and MaterialFile are exported from ./materials-db/types

// ============================================================================
// UNIFIED MATERIAL RECORD (for Archive View)
// Combines tool-based materials from API with file-based materials from IndexedDB
// ============================================================================

export interface MaterialRecord {
  id: string;
  toolId: string;
  toolType: ToolType;
  title?: string;
  content: Record<string, unknown>;
  maestroId?: string;
  sessionId?: string;
  subject?: string;
  preview?: string;
  status: 'active' | 'archived' | 'deleted';
  // User interaction (Issue #37 - Archive features)
  userRating?: number; // 1-5 stars
  isBookmarked: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get all active materials (tools + files) for the Archive View
 * Fetches from the /api/materials endpoint which queries Prisma
 */
export async function getActiveMaterials(): Promise<MaterialRecord[]> {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    // Get userId from sessionStorage (temporary until auth is implemented)
    const userId = sessionStorage.getItem('mirrorbuddy-user-id') || 'default-user';

    const response = await fetch(`/api/materials?userId=${userId}&status=active`);
    if (!response.ok) {
      logger.error('Failed to fetch materials', { status: response.status });
      return [];
    }

    const data = await response.json();
    return data.materials || [];
  } catch (error) {
    logger.error('Error fetching active materials', { error });
    return [];
  }
}
