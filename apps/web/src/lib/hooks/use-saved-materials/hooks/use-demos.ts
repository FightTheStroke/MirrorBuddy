/**
 * @file use-demos.ts
 * @brief Hook for interactive demos
 */

import { useState, useEffect, useCallback } from 'react';
import { getUserId } from '../utils/user-id';
import { fetchMaterials, saveMaterialToAPI, deleteMaterialFromAPI } from '../utils/api';
import type { SavedDemo } from '../types';

export function useDemos() {
  const [demos, setDemos] = useState<SavedDemo[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = getUserId();

  const loadDemos = useCallback(async () => {
    setLoading(true);
    const materials = await fetchMaterials('demo', userId);
    const mapped: SavedDemo[] = materials.map((m) => {
      const content = m.content as {
        code?: string;
        html?: string;
        css?: string;
        js?: string;
        description?: string;
        tags?: string[];
      };
      let code = content.code || '';
      if (!code && content.html) {
        code = content.html;
        if (content.css) {
          code = `<style>${content.css}</style>\n${code}`;
        }
        if (content.js) {
          code = `${code}\n<script>${content.js}</script>`;
        }
      }
      return {
        id: m.toolId,
        title: m.title,
        description: content.description,
        code,
        subject: m.subject,
        maestroId: m.maestroId,
        tags: content.tags || [],
        createdAt: new Date(m.createdAt),
      };
    });
    setDemos(mapped);
    setLoading(false);
  }, [userId]);

  /* eslint-disable react-hooks/set-state-in-effect -- ADR 0015: Data loading pattern */
  useEffect(() => {
    loadDemos();
  }, [loadDemos]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saveDemo = useCallback(
    async (demo: Omit<SavedDemo, 'id' | 'createdAt'>) => {
      const saved = await saveMaterialToAPI(
        userId,
        'demo',
        demo.title,
        { code: demo.code, description: demo.description, tags: demo.tags },
        { subject: demo.subject, maestroId: demo.maestroId }
      );
      if (saved) {
        await loadDemos();
      }
      return saved;
    },
    [userId, loadDemos]
  );

  const deleteDemo = useCallback(async (id: string) => {
    const success = await deleteMaterialFromAPI(id);
    if (success) {
      setDemos((prev) => prev.filter((d) => d.id !== id));
    }
    return success;
  }, []);

  return { demos, loading, saveDemo, deleteDemo, reload: loadDemos };
}

