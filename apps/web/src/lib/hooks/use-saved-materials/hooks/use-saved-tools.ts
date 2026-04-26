/**
 * @file use-saved-tools.ts
 * @brief Generic hook for saved tools
 */

import { useState, useEffect, useCallback } from 'react';
import type { ToolType } from '@/types/tools';
import { getUserId } from '../utils/user-id';
import { fetchMaterials, deleteMaterialFromAPI } from '../utils/api';
import type { SavedMaterial } from '../types';

export function useSavedTools(toolType: ToolType) {
  const [tools, setTools] = useState<SavedMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = getUserId();

  const loadTools = useCallback(async () => {
    setLoading(true);
    const materials = await fetchMaterials(toolType, userId);
    setTools(materials);
    setLoading(false);
  }, [userId, toolType]);

  /* eslint-disable react-hooks/set-state-in-effect -- ADR 0015: Data loading pattern */
  useEffect(() => {
    loadTools();
  }, [loadTools]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const deleteTool = useCallback(async (id: string) => {
    const success = await deleteMaterialFromAPI(id);
    if (success) {
      setTools((prev) => prev.filter((t) => t.toolId !== id));
    }
    return success;
  }, []);

  return { tools, loading, deleteTool, reload: loadTools };
}

