"use client";

import { useState, useCallback } from "react";

interface DeletedUserBackup {
  userId: string;
  email: string | null;
  username: string | null;
  deletedAt: string;
}

export function useUsersTrash() {
  const [deletedBackups, setDeletedBackups] = useState<DeletedUserBackup[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadTrash = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users/trash");
      if (res.ok) setDeletedBackups((await res.json()).backups || []);
    } catch {
      setError("Failed to load trash");
    }
  }, []);

  return { deletedBackups, setDeletedBackups, error, setError, loadTrash };
}
