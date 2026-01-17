// ============================================================================
// MATERIALS DATABASE ARCHIVE OPERATIONS
// Unified material record for Archive View
// ============================================================================

import { logger } from '@/lib/logger';
import type { ToolType } from '@/types/tools';

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
