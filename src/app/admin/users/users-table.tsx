"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { csrfFetch } from "@/lib/auth/csrf-client";
import { UsersBulkActions } from "./users-bulk-actions";
import { UsersSearch } from "./users-search";
import { UsersTrashToolbar } from "./users-trash-toolbar";
import { UsersTableRow } from "./users-table-row";
import { UsersTrashRow } from "./users-trash-row";

interface User {
  id: string;
  username: string | null;
  email: string | null;
  role: "USER" | "ADMIN";
  disabled: boolean;
  createdAt: Date;
}

interface DeletedUserBackup {
  userId: string;
  email: string | null;
  username: string | null;
  deletedAt: string;
}

type FilterTab = "all" | "active" | "disabled" | "trash";

export function UsersTable({ users }: { users: User[] }) {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletedBackups, setDeletedBackups] = useState<DeletedUserBackup[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadTrash = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users/trash");
      if (res.ok) setDeletedBackups((await res.json()).backups || []);
    } catch {
      setError("Failed to load trash");
    }
  }, []);

  useEffect(() => {
    if (filter === "trash") void loadTrash();
  }, [filter, loadTrash]);

  const filteredUsers = useMemo(() => {
    let result = users;
    if (filter === "active") result = users.filter((u) => !u.disabled);
    else if (filter === "disabled") result = users.filter((u) => u.disabled);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.email?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [users, filter, search]);

  const handleAction = async (
    userId: string,
    action: "toggle" | "delete" | "restore",
    currentDisabled?: boolean,
  ) => {
    setIsLoading(userId);
    setError(null);
    try {
      if (action === "toggle") {
        await fetch(`/api/admin/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ disabled: !currentDisabled }),
        });
      } else if (action === "delete") {
        if (!confirm("Confermi eliminazione?")) return;
        await csrfFetch(`/api/admin/users/${userId}`, {
          method: "DELETE",
          body: JSON.stringify({ reason: "admin_delete" }),
        });
      } else if (action === "restore") {
        await csrfFetch(`/api/admin/users/trash/${userId}/restore`, {
          method: "POST",
        });
        await loadTrash();
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsLoading(null);
    }
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const toggleSelectAll = () =>
    setSelectedIds(
      selectedIds.size === filteredUsers.length
        ? new Set()
        : new Set(filteredUsers.map((u) => u.id)),
    );

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "Tutti" },
    { key: "active", label: "Attivi" },
    { key: "disabled", label: "Disabilitati" },
    { key: "trash", label: "Cestino" },
  ];

  return (
    <div>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-2 mb-4 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setFilter(tab.key);
              setSelectedIds(new Set());
            }}
            className={`px-4 py-2 text-sm font-medium ${
              filter === tab.key
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
            {tab.key === "trash" ? ` (${deletedBackups.length})` : ""}
            {tab.key === "all" ? ` (${users.length})` : ""}
          </button>
        ))}
      </div>

      {filter !== "trash" && (
        <UsersSearch value={search} onChange={setSearch} />
      )}
      {filter === "trash" && (
        <UsersTrashToolbar
          count={deletedBackups.length}
          onEmptyComplete={loadTrash}
        />
      )}

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              {filter !== "trash" && (
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size === filteredUsers.length &&
                      filteredUsers.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left font-semibold">Username</th>
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              {filter !== "trash" && (
                <>
                  <th className="px-4 py-3 text-left font-semibold">Role</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                </>
              )}
              <th className="px-4 py-3 text-left font-semibold">
                {filter === "trash" ? "Eliminato" : "Creato"}
              </th>
              <th className="px-4 py-3 text-left font-semibold">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filter === "trash"
              ? deletedBackups.map((b) => (
                  <UsersTrashRow
                    key={b.userId}
                    backup={b}
                    isLoading={isLoading === b.userId}
                    onRestore={() => handleAction(b.userId, "restore")}
                  />
                ))
              : filteredUsers.map((user) => (
                  <UsersTableRow
                    key={user.id}
                    user={user}
                    isSelected={selectedIds.has(user.id)}
                    isLoading={isLoading === user.id}
                    onSelect={() => toggleSelect(user.id)}
                    onToggle={() =>
                      handleAction(user.id, "toggle", user.disabled)
                    }
                    onDelete={() => handleAction(user.id, "delete")}
                  />
                ))}
          </tbody>
        </table>
        {filter !== "trash" && filteredUsers.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            Nessun utente trovato
          </div>
        )}
        {filter === "trash" && deletedBackups.length === 0 && (
          <div className="text-center py-8 text-slate-500">Cestino vuoto</div>
        )}
      </div>

      <UsersBulkActions
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds(new Set())}
        onActionComplete={() => window.location.reload()}
      />
    </div>
  );
}
