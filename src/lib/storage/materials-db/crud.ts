// ============================================================================
// MATERIALS DATABASE CRUD OPERATIONS
// Create, Read, Update, Delete operations for materials
// ============================================================================

import { getMaterialsDB } from './db';
import { generateThumbnail } from './thumbnail';
import type { MaterialsDB } from './types';

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
  let results: Array<MaterialsDB['metadata']['value']> = await db.getAll('metadata');

  // Apply filters
  if (filter?.subject) {
    results = results.filter((m: MaterialsDB['metadata']['value']) => m.subject === filter.subject);
  }
  if (filter?.format) {
    results = results.filter((m: MaterialsDB['metadata']['value']) => m.format === filter.format);
  }

  // Sort by date descending (most recent first)
  results.sort((a: MaterialsDB['metadata']['value'], b: MaterialsDB['metadata']['value']) => b.createdAt.getTime() - a.createdAt.getTime());

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
