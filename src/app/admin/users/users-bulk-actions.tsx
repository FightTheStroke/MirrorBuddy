"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Lock, Unlock, X } from "lucide-react";
import { csrfFetch } from "@/lib/auth/csrf-client";

interface UsersBulkActionsProps {
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export function UsersBulkActions({
  selectedIds,
  onClearSelection,
  onActionComplete,
}: UsersBulkActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const count = selectedIds.size;

  if (count === 0) return null;

  const handleBulkDisable = async () => {
    if (!confirm(`Disabilitare ${count} utenti?`)) return;
    setIsLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/users/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ disabled: true }),
          }),
        ),
      );
      onClearSelection();
      onActionComplete();
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkEnable = async () => {
    if (!confirm(`Abilitare ${count} utenti?`)) return;
    setIsLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/users/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ disabled: false }),
          }),
        ),
      );
      onClearSelection();
      onActionComplete();
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Eliminare definitivamente ${count} utenti?`)) return;
    setIsLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) =>
          csrfFetch(`/api/admin/users/${id}`, {
            method: "DELETE",
            body: JSON.stringify({ reason: "bulk_admin_delete" }),
          }),
        ),
      );
      onClearSelection();
      onActionComplete();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 px-4 py-3 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl">
        <span className="text-sm font-medium">{count} selezionati</span>
        <div className="h-4 w-px bg-border" />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleBulkEnable}
          disabled={isLoading}
          className="hover:bg-accent"
        >
          <Unlock className="w-4 h-4 mr-1" />
          Abilita
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleBulkDisable}
          disabled={isLoading}
          className="hover:bg-accent"
        >
          <Lock className="w-4 h-4 mr-1" />
          Disabilita
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleBulkDelete}
          disabled={isLoading}
          className="text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Elimina
        </Button>
        <div className="h-4 w-px bg-border" />
        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          className="hover:bg-accent"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
