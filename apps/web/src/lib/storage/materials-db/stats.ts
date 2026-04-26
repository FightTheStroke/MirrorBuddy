// ============================================================================
// MATERIALS DATABASE STATS & CLEANUP
// Statistics and cleanup operations
// ============================================================================

import { getMaterialsDB } from './db';

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
