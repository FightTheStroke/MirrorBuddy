'use client';

import { useState, useCallback } from 'react';
import { csrfFetch } from '@/lib/auth';

export function useUserActions() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = useCallback(
    async (
      userId: string,
      action: 'toggle' | 'delete' | 'restore' | 'roleToggle',
      currentValue?: boolean | string,
      loadTrash?: () => Promise<void>,
    ) => {
      setIsLoading(userId);
      setError(null);
      try {
        if (action === 'toggle') {
          await csrfFetch(`/api/admin/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ disabled: !currentValue }),
          });
        } else if (action === 'roleToggle') {
          const newRole = currentValue === 'ADMIN' ? 'USER' : 'ADMIN';
          await csrfFetch(`/api/admin/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole }),
          });
        } else if (action === 'delete') {
          if (!confirm('Confermi eliminazione?')) return;
          await csrfFetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason: 'admin_delete' }),
          });
        } else if (action === 'restore') {
          await csrfFetch(`/api/admin/users/trash/${userId}/restore`, {
            method: 'POST',
          });
          if (loadTrash) await loadTrash();
        }
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error');
      } finally {
        setIsLoading(null);
      }
    },
    [],
  );

  return { isLoading, error, handleAction };
}
