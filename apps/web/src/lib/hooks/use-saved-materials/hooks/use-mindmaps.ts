/**
 * @file use-mindmaps.ts
 * @brief Hook for mindmaps
 */

import { useState, useEffect, useCallback } from 'react';
import type { Subject } from '@/types';
import { getUserId } from '../utils/user-id';
import { fetchMaterials, saveMaterialToAPI, deleteMaterialFromAPI } from '../utils/api';
import type { SavedMindmap, MindmapNode } from '../types';

export function useMindmaps() {
  const [mindmaps, setMindmaps] = useState<SavedMindmap[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = getUserId();

  const loadMindmaps = useCallback(async () => {
    setLoading(true);
    const materials = await fetchMaterials('mindmap', userId);
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
    setLoading(false);
  }, [userId]);

  /* eslint-disable react-hooks/set-state-in-effect -- ADR 0015: Data loading pattern */
  useEffect(() => {
    loadMindmaps();
  }, [loadMindmaps]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
        { subject: mindmap.subject, maestroId: mindmap.maestroId }
      );
      if (saved) {
        await loadMindmaps();
      }
      return saved;
    },
    [userId, loadMindmaps]
  );

  const deleteMindmap = useCallback(async (id: string) => {
    const success = await deleteMaterialFromAPI(id);
    if (success) {
      setMindmaps((prev) => prev.filter((m) => m.id !== id));
    }
    return success;
  }, []);

  return { mindmaps, loading, saveMindmap, deleteMindmap, reload: loadMindmaps };
}

