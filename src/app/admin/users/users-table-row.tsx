"use client";

import { Button } from "@/components/ui/button";
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
    <tr className="border-b hover:bg-slate-50">
      <td className="px-3 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="rounded"
        />
      </td>
      <td className="px-4 py-3 font-medium">{user.username || "—"}</td>
      <td className="px-4 py-3 text-slate-600">{user.email || "—"}</td>
      <td className="px-4 py-3">
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            user.role === "ADMIN"
              ? "bg-amber-100 text-amber-800"
              : "bg-slate-100"
          }`}
        >
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`px-2 py-1 rounded text-xs ${
            user.disabled
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {user.disabled ? "Disabled" : "Active"}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-600">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
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
      </td>
    </tr>
  );
}
