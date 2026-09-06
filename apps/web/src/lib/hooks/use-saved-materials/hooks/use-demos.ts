/**
 * @file use-demos.ts
 * @brief Hook for interactive demos
 */

import { useState, useEffect, useCallback } from 'react';
import { isCurrentOwner, useMaterialOwner } from '../utils/use-material-owner';
import { fetchMaterials, saveMaterialToAPI, deleteMaterialFromAPI } from '../utils/api';
import type { SavedDemo } from '../types';

export function useDemos() {
  const [demos, setDemos] = useState<SavedDemo[]>([]);
  const [loading, setLoading] = useState(true);
  const { userId, identity, identityError } = useMaterialOwner();
  const [error, setError] = useState<string | null>(null);
  const [loadedOwner, setLoadedOwner] = useState<string | null>(null);

  const loadDemos = useCallback(async () => {
    setLoading(true);
    try {
      const materials = await fetchMaterials('demo', userId);
      if (!isCurrentOwner(identity)) return;
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
      setLoadedOwner(userId);
      setError(null);
    } catch {
      if (isCurrentOwner(identity)) setError('MATERIALS_UNAVAILABLE');
    } finally {
      if (isCurrentOwner(identity)) setLoading(false);
    }
  }, [userId, identity]);

  useEffect(() => {
    loadDemos();
  }, [loadDemos]);

  const saveDemo = useCallback(
    async (demo: Omit<SavedDemo, 'id' | 'createdAt'>) => {
      const saved = await saveMaterialToAPI(
        userId,
        'demo',
        demo.title,
        { code: demo.code, description: demo.description, tags: demo.tags },
        { subject: demo.subject, maestroId: demo.maestroId },
      );
      if (saved) {
        await loadDemos();
      }
      return saved;
    },
    [userId, loadDemos],
  );

  const deleteDemo = useCallback(async (id: string) => {
    const success = await deleteMaterialFromAPI(id);
    if (success) {
      setDemos((prev) => prev.filter((d) => d.id !== id));
    }
    return success;
  }, []);

  return {
    demos: userId && loadedOwner === userId ? demos : [],
    loading,
    error: identityError || error,
    saveDemo,
    deleteDemo,
    reload: loadDemos,
  };
}
