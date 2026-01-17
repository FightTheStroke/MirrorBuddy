/**
 * Materials Database Utilities
 * Cleanup, statistics, thumbnail generation, and archive operations
 */

import { logger } from "@/lib/logger";
import { getUserIdFromCookie } from "@/lib/auth/client-auth";
import { getMaterialsDB, MaterialsDB } from "./materials-db-schema";
import type { ToolType } from "@/types/tools";

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type MaterialMetadata = MaterialsDB["metadata"]["value"];
export type MaterialFile = MaterialsDB["files"]["value"];

/**
 * Unified material record (for Archive View)
 * Combines tool-based materials from API with file-based materials from IndexedDB
 */
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
  status: "active" | "archived" | "deleted";
  // User interaction (Issue #37 - Archive features)
  userRating?: number; // 1-5 stars
  isBookmarked: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// CLEANUP OPERATIONS
// ============================================================================

/**
 * Delete all materials
 */
export async function clearAllMaterials(): Promise<void> {
  const db = await getMaterialsDB();
  await db.clear("files");
  await db.clear("metadata");
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
  const all = await db.getAll("metadata");

  const stats = {
    total: all.length,
    images: 0,
    pdfs: 0,
    totalSize: 0,
    bySubject: {} as Record<string, number>,
  };

  for (const material of all) {
    if (material.format === "image") {
      stats.images++;
    } else if (material.format === "pdf") {
      stats.pdfs++;
    }

    stats.totalSize += material.size;

    if (material.subject) {
      stats.bySubject[material.subject] =
        (stats.bySubject[material.subject] || 0) + 1;
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
export async function generateThumbnail(
  blob: Blob,
  maxSize = 200,
): Promise<Blob> {
  // Server-side check
  if (typeof window === "undefined") {
    return blob;
  }

  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
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
        "image/jpeg",
        0.7,
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
// ARCHIVE VIEW OPERATIONS
// ============================================================================

/**
 * Get all active materials (tools + files) for the Archive View
 * Fetches from the /api/materials endpoint which queries Prisma
 */
export async function getActiveMaterials(): Promise<MaterialRecord[]> {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    // Get userId from cookie
    const userId = getUserIdFromCookie() || "default-user";

    const response = await fetch(
      `/api/materials?userId=${userId}&status=active`,
    );
    if (!response.ok) {
      logger.error("Failed to fetch materials", { status: response.status });
      return [];
    }

    const data = await response.json();
    return data.materials || [];
  } catch (error) {
    logger.error("Error fetching active materials", { error });
    return [];
  }
}
