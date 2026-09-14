/**
 * @file use-mindmaps.ts
 * @brief Hook for mindmaps
 */

import { useState, useEffect, useCallback } from 'react';
import type { Subject } from '@/types';
import { isCurrentOwner, useMaterialOwner } from '../utils/use-material-owner';
import { fetchMaterials, saveMaterialToAPI, deleteMaterialFromAPI } from '../utils/api';
import type { SavedMindmap, MindmapNode } from '../types';

export function useMindmaps() {
  const [mindmaps, setMindmaps] = useState<SavedMindmap[]>([]);
  const [loading, setLoading] = useState(true);
  const { userId, identity, identityError } = useMaterialOwner();
  const [error, setError] = useState<string | null>(null);
  const [loadedOwner, setLoadedOwner] = useState<string | null>(null);

  const loadMindmaps = useCallback(async () => {
    setLoading(true);
    try {
      const materials = await fetchMaterials('mindmap', userId);
      if (!isCurrentOwner(identity)) return;
      const mapped: SavedMindmap[] = materials.map((m) => {
        const content = m.content as {
          nodes?: MindmapNode[];
          markdown?: string;
          title?: string;
          topic?: string;
        };
        return {
          id: m.toolId,
          title: m.title || content.title || content.topic || 'Untitled',
          nodes: content.nodes || [],
          markdown: content.markdown,
          subject: (m.subject || 'general') as Subject,
          createdAt: new Date(m.createdAt),
          maestroId: m.maestroId,
        };
      });
      setMindmaps(mapped);
      setLoadedOwner(userId);
      setError(null);
    } catch {
      if (isCurrentOwner(identity)) setError('MATERIALS_UNAVAILABLE');
    } finally {
      if (isCurrentOwner(identity)) setLoading(false);
    }
  }, [userId, identity]);

  useEffect(() => {
    loadMindmaps();
  }, [loadMindmaps]);

  const saveMindmap = useCallback(
    async (mindmap: Omit<SavedMindmap, 'id' | 'createdAt'>) => {
      const saved = await saveMaterialToAPI(
        userId,
        'mindmap',
        mindmap.title,
        {
          nodes: mindmap.nodes,
          markdown: mindmap.markdown,
          title: mindmap.title,
        },
        { subject: mindmap.subject, maestroId: mindmap.maestroId },
      );
      if (saved) {
        await loadMindmaps();
      }
      return saved;
    },
    [userId, loadMindmaps],
  );

  const deleteMindmap = useCallback(async (id: string) => {
    const success = await deleteMaterialFromAPI(id);
    if (success) {
      setMindmaps((prev) => prev.filter((m) => m.id !== id));
    }
    return success;
  }, []);

  return {
    mindmaps: userId && loadedOwner === userId ? mindmaps : [],
    loading,
    error: identityError || error,
    saveMindmap,
    deleteMindmap,
    reload: loadMindmaps,
  };
}
