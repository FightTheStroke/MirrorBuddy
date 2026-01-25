"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { csrfFetch } from "@/lib/auth/csrf-client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableEmpty,
} from "@/components/ui/table";
import { ResponsiveTable } from "@/components/admin/responsive-table";
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
  subscription: {
    id: string;
    tier: {
      id: string;
      code: string;
      name: string;
      chatLimitDaily: number;
      voiceMinutesDaily: number;
      toolsLimitDaily: number;
      docsLimitTotal: number;
      features: unknown;
    };
    overrideLimits: unknown;
    overrideFeatures: unknown;
  } | null;
}

interface Tier {
  id: string;
  code: string;
  name: string;
}

interface DeletedUserBackup {
  userId: string;
  email: string | null;
  username: string | null;
  deletedAt: string;
}

type FilterTab = "all" | "active" | "disabled" | "trash";

export function UsersTable({
  users,
  availableTiers,
}: {
  users: User[];
  availableTiers: Tier[];
}) {
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

  return (
    <div>
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      <Tabs
        value={filter}
        onValueChange={(value) => {
          setFilter(value as FilterTab);
          setSelectedIds(new Set());
        }}
      >
        <TabsList className="mb-4 overflow-x-auto snap-x snap-mandatory md:overflow-visible md:snap-none">
          <TabsTrigger
            value="all"
            icon="users"
            title={`Tutti (${users.length})`}
            className="min-h-11 min-w-11 md:min-w-auto"
          >
            <span className="sr-only">Tutti ({users.length})</span>
            <span className="md:hidden">👥</span>
            <span className="hidden md:inline">Tutti ({users.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="active"
            icon="check-circle"
            title="Attivi"
            className="min-h-11 min-w-11 md:min-w-auto"
          >
            <span className="sr-only">Attivi</span>
            <span className="md:hidden">✓</span>
            <span className="hidden md:inline">Attivi</span>
          </TabsTrigger>
          <TabsTrigger
            value="disabled"
            icon="ban"
            title="Disabilitati"
            className="min-h-11 min-w-11 md:min-w-auto"
          >
            <span className="sr-only">Disabilitati</span>
            <span className="md:hidden">🚫</span>
            <span className="hidden md:inline">Disabilitati</span>
          </TabsTrigger>
          <TabsTrigger
            value="trash"
            icon="trash"
            title={`Cestino (${deletedBackups.length})`}
            className="min-h-11 min-w-11 md:min-w-auto"
          >
            <span className="sr-only">Cestino ({deletedBackups.length})</span>
            <span className="md:hidden">🗑️</span>
            <span className="hidden md:inline">
              Cestino ({deletedBackups.length})
            </span>
          </TabsTrigger>
        </TabsList>

        {filter !== "trash" && (
          <UsersSearch value={search} onChange={setSearch} />
        )}
        {filter === "trash" && (
          <UsersTrashToolbar
            count={deletedBackups.length}
            onEmptyComplete={loadTrash}
          />
        )}

        <ResponsiveTable caption="Users table">
          <Table>
            <TableHeader>
              <TableRow>
                {filter !== "trash" && (
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size === filteredUsers.length &&
                        filteredUsers.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </TableHead>
                )}
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                {filter !== "trash" && (
                  <>
                    <TableHead>Role</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                  </>
                )}
                <TableHead>
                  {filter === "trash" ? "Eliminato" : "Creato"}
                </TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
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
                      availableTiers={availableTiers}
                    />
                  ))}
            </TableBody>
          </Table>
        </ResponsiveTable>

        {filter !== "trash" && filteredUsers.length === 0 && (
          <TableEmpty>Nessun utente trovato</TableEmpty>
        )}
        {filter === "trash" && deletedBackups.length === 0 && (
          <TableEmpty>Cestino vuoto</TableEmpty>
        )}

        <UsersBulkActions
          selectedIds={selectedIds}
          onClearSelection={() => setSelectedIds(new Set())}
          onActionComplete={() => window.location.reload()}
          users={users}
          availableTiers={availableTiers}
        />
      </Tabs>
    </div>
  );
}
