// ============================================================================
// MATERIALS DATABASE INDEX
// Re-exports all materials-db functionality
// ============================================================================

export type { MaterialsDB, MaterialMetadata, MaterialFile } from './types';
export type { MaterialRecord } from './archive';

export { getMaterialsDB } from './db';
export { generateThumbnail } from './thumbnail';
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
} from './crud';
export { clearAllMaterials, getMaterialsStats } from './stats';
export { getActiveMaterials } from './archive';
