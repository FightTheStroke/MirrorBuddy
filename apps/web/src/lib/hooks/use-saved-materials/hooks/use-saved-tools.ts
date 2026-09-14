/**
 * @file use-saved-tools.ts
 * @brief Generic hook for saved tools
 */

import { useState, useEffect, useCallback } from 'react';
import type { ToolType } from '@/types/tools';
import { isCurrentOwner, useMaterialOwner } from '../utils/use-material-owner';
import { fetchMaterials, deleteMaterialFromAPI } from '../utils/api';
import type { SavedMaterial } from '../types';

export function useSavedTools(toolType: ToolType) {
  const [tools, setTools] = useState<SavedMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const { userId, identity, identityError } = useMaterialOwner();
  const [error, setError] = useState<string | null>(null);
  const [loadedOwner, setLoadedOwner] = useState<string | null>(null);

  const loadTools = useCallback(async () => {
    setLoading(true);
    try {
      const materials = await fetchMaterials(toolType, userId);
      if (!isCurrentOwner(identity)) return;
      setTools(materials);
      setLoadedOwner(userId);
      setError(null);
    } catch {
      if (isCurrentOwner(identity)) setError('MATERIALS_UNAVAILABLE');
    } finally {
      if (isCurrentOwner(identity)) setLoading(false);
    }
  }, [userId, identity, toolType]);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  const deleteTool = useCallback(async (id: string) => {
    const success = await deleteMaterialFromAPI(id);
    if (success) {
      setTools((prev) => prev.filter((t) => t.toolId !== id));
    }
    return success;
  }, []);

  return {
    tools: userId && loadedOwner === userId ? tools : [],
    loading,
    error: identityError || error,
    deleteTool,
    reload: loadTools,
  };
}
