/**
 * @file api.ts
 * @brief API utilities for saved materials
 */

import { logger } from '@/lib/logger';
import type { ToolType } from '@/types/tools';
import type { SavedMaterial } from '../types';
import { csrfFetch } from '@/lib/auth';

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
    logger.error('Failed to fetch materials', { toolType }, error);
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
    const response = await csrfFetch('/api/materials', {
      method: 'POST',
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
    logger.error('Failed to save material', { toolType, title }, error);
    return null;
  }
}

export async function deleteMaterialFromAPI(toolId: string): Promise<boolean> {
  try {
    const response = await csrfFetch(`/api/materials?toolId=${toolId}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch (error) {
    logger.error('Failed to delete material', { toolId }, error);
    return false;
  }
}

export async function updateMaterialInAPI(
  toolId: string,
  content: Record<string, unknown>,
  title?: string
): Promise<boolean> {
  try {
    const response = await csrfFetch('/api/materials', {
      method: 'PATCH',
      body: JSON.stringify({ toolId, content, title }),
    });
    return response.ok;
  } catch (error) {
    logger.error('Failed to update material', { toolId }, error);
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
    const requestBody = {
      userId,
      toolId,
      toolType,
      title,
      content,
      ...options,
    };

    const response = await csrfFetch('/api/materials', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorData: Record<string, unknown> = {};
      try {
        errorData = await response.json();
      } catch {
        // If response is not JSON, try to get text
        const text = await response.text().catch(() => '');
        errorData = { message: text || `HTTP ${response.status}` };
      }
      
      const errorMessage = `API error: ${response.status} - ${JSON.stringify(errorData)}`;
      logger.error('Failed to save material - API error', {
        errorDetails: errorMessage,
        status: response.status,
        statusText: response.statusText,
        toolType,
        title,
        userId,
        toolId,
        errorData,
      });
      throw new Error(errorMessage);
    }

    const data = await response.json();
    if (!data.material) {
      logger.warn('Save material response missing material field', {
        toolType,
        title,
        response: data,
      });
      return null;
    }
    
    return data.material;
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : String(error);
    
    logger.error('Failed to save material', {
      errorDetails: errorMessage || 'Unknown error',
      toolType: toolType || 'unknown',
      title: title || 'untitled',
      userId: userId || 'unknown',
      toolId: toolId || 'unknown',
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    });
    return null;
  }
}

