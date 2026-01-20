"use client";

import { Button } from "@/components/ui/button";
import { ArchiveRestore } from "lucide-react";

interface DeletedUserBackup {
  userId: string;
  email: string | null;
  username: string | null;
  deletedAt: string;
}

interface UsersTrashRowProps {
  backup: DeletedUserBackup;
  isLoading: boolean;
  onRestore: () => void;
}

export function UsersTrashRow({
  backup,
  isLoading,
  onRestore,
}: UsersTrashRowProps) {
  return (
    <tr className="border-b hover:bg-slate-50">
      <td className="px-4 py-3">{backup.username || "—"}</td>
      <td className="px-4 py-3 text-slate-600">{backup.email || "—"}</td>
      <td className="px-4 py-3 text-slate-600">
        {new Date(backup.deletedAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        <Button
          size="sm"
          variant="outline"
          onClick={onRestore}
          disabled={isLoading}
        >
          <ArchiveRestore className="w-3 h-3 mr-1" />
          Ripristina
        </Button>
      </td>
    </tr>
  );
}
