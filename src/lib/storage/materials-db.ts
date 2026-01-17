// ============================================================================
// MATERIALS DATABASE
// IndexedDB storage for uploaded files (webcam photos, PDFs)
// Uses the idb library for a Promise-based IndexedDB API
// Issue #22: Materials Archive - Storage (IndexedDB)
// ============================================================================

// Re-export all from modular materials-db directory
export type { MaterialsDB, MaterialMetadata, MaterialFile } from './materials-db/types';
export type { MaterialRecord } from './materials-db/archive';

export { getMaterialsDB } from './materials-db/db';
export { generateThumbnail } from './materials-db/thumbnail';
export {
  saveMaterial,
  getMaterials,
  getMaterialFile,
  getMaterialThumbnail,
  getMaterialMetadata,
  updateMaterialMetadata,
  deleteMaterial,
  getMaterialsBySubject,
  getMaterialsByFormat,
  getRecentMaterials,
} from './materials-db/crud';
export { clearAllMaterials, getMaterialsStats } from './materials-db/stats';
export { getActiveMaterials } from './materials-db/archive';
