"use client";

import { Button } from "@/components/ui/button";
import { TableCell } from "@/components/ui/table";
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
    <tr className="border-b hover:bg-accent">
      <TableCell>{backup.username || "—"}</TableCell>
      <TableCell className="text-muted-foreground">
        {backup.email || "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {new Date(backup.deletedAt).toLocaleDateString()}
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant="outline"
          onClick={onRestore}
          disabled={isLoading}
        >
          <ArchiveRestore className="w-3 h-3 mr-1" />
          Ripristina
        </Button>
      </TableCell>
    </tr>
  );
}
