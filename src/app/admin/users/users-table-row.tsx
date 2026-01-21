"use client";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableCell } from "@/components/ui/table";
import { Lock, Unlock, Trash2 } from "lucide-react";

interface User {
  id: string;
  username: string | null;
  email: string | null;
  role: "USER" | "ADMIN";
  disabled: boolean;
  createdAt: Date;
}

interface UsersTableRowProps {
  user: User;
  isSelected: boolean;
  isLoading: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

export function UsersTableRow({
  user,
  isSelected,
  isLoading,
  onSelect,
  onToggle,
  onDelete,
}: UsersTableRowProps) {
  return (
    <tr className="border-b hover:bg-accent">
      <TableCell className="px-3 py-3 w-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="rounded"
        />
      </TableCell>
      <TableCell className="font-medium">{user.username || "—"}</TableCell>
      <TableCell className="text-muted-foreground">
        {user.email || "—"}
      </TableCell>
      <TableCell>
        <StatusBadge variant={user.role === "ADMIN" ? "warning" : "neutral"}>
          {user.role}
        </StatusBadge>
      </TableCell>
      <TableCell>
        <StatusBadge variant={user.disabled ? "disabled" : "active"}>
          {user.disabled ? "Disabled" : "Active"}
        </StatusBadge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {new Date(user.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={onToggle}
            disabled={isLoading}
            className="text-xs"
            aria-label={user.disabled ? "Enable user" : "Disable user"}
          >
            {user.disabled ? (
              <Unlock className="w-3 h-3" />
            ) : (
              <Lock className="w-3 h-3" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            disabled={isLoading}
            className="text-xs text-red-600"
            aria-label="Delete user"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </TableCell>
    </tr>
  );
}
