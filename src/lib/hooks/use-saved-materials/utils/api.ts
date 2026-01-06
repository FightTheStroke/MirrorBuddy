/**
 * @file api.ts
 * @brief API utilities for saved materials
 */

import { logger } from '@/lib/logger';
import type { ToolType } from '@/types/tools';
import type { SavedMaterial } from '../types';

export async function fetchMaterials(
  toolType: ToolType,
  userId: string
): Promise<SavedMaterial[]> {
  try {
    const response = await fetch(
      `/api/materials?userId=${userId}&toolType=${toolType}&status=active`
    );
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return data.materials || [];
  } catch (error) {
    logger.error('Failed to fetch materials', { error, toolType });
    return [];
  }
}

export async function saveMaterialToAPI(
  userId: string,
  toolType: ToolType,
  title: string,
  content: Record<string, unknown>,
  options?: {
    subject?: string;
    maestroId?: string;
    preview?: string;
  }
): Promise<SavedMaterial | null> {
  try {
    const toolId = crypto.randomUUID();
    const response = await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        toolId,
        toolType,
        title,
        content,
        ...options,
      }),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return data.material;
  } catch (error) {
    logger.error('Failed to save material', { error, toolType, title });
    return null;
  }
}

export async function deleteMaterialFromAPI(toolId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/materials?toolId=${toolId}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch (error) {
    logger.error('Failed to delete material', { error, toolId });
    return false;
  }
}

export async function updateMaterialInAPI(
  toolId: string,
  content: Record<string, unknown>,
  title?: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/materials', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolId, content, title }),
    });
    return response.ok;
  } catch (error) {
    logger.error('Failed to update material', { error, toolId });
    return false;
  }
}

export function generateContentHash(
  toolType: string,
  title: string,
  content: Record<string, unknown>
): string {
  const str = `${toolType}-${title}-${JSON.stringify(content)}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `auto-${Math.abs(hash).toString(36)}`;
}

export async function saveMaterialToAPIWithId(
  userId: string,
  toolId: string,
  toolType: ToolType,
  title: string,
  content: Record<string, unknown>,
  options?: { subject?: string; maestroId?: string; preview?: string }
): Promise<SavedMaterial | null> {
  try {
    const response = await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        toolId,
        toolType,
        title,
        content,
        ...options,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }
    const data = await response.json();
    return data.material;
  } catch (error) {
    logger.error('Failed to save material', {
      error: error instanceof Error ? error.message : String(error),
      toolType,
      title,
    });
    return null;
  }
}

