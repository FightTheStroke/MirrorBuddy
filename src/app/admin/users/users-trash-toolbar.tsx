"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { csrfFetch } from "@/lib/auth";

interface UsersTrashToolbarProps {
  count: number;
  onEmptyComplete: () => void;
}

export function UsersTrashToolbar({
  count,
  onEmptyComplete,
}: UsersTrashToolbarProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleEmptyTrash = async () => {
    if (count === 0) return;
    if (
      !confirm(
        `Svuotare il cestino? ${count} utenti verranno eliminati DEFINITIVAMENTE.`,
      )
    )
      return;
    if (!confirm("Questa azione è IRREVERSIBILE. Confermi?")) return;

    setIsLoading(true);
    try {
      const response = await csrfFetch("/api/admin/users/trash?all=true", {
        method: "DELETE",
      });
      if (response.ok) {
        onEmptyComplete();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
      <span className="text-sm text-amber-800 dark:text-amber-200">
        {count} {count === 1 ? "utente" : "utenti"} nel cestino
      </span>
      <Button
        size="sm"
        variant="outline"
        onClick={handleEmptyTrash}
        disabled={isLoading || count === 0}
        className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4 mr-1" />
        )}
        Svuota cestino
      </Button>
    </div>
  );
}
