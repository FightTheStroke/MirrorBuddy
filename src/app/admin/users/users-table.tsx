"use client";

import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { useStagingDataFilter } from "@/hooks/use-staging-data-filter";
import { useUsersFilter } from "@/hooks/use-users-filter";
import { useUsersTrash } from "@/hooks/use-users-trash";
import { useUserActions } from "@/hooks/use-user-actions";
import { StagingDataToggle } from "@/components/admin/staging-data-toggle";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableEmpty,
} from "@/components/ui/table";
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
  isTestData: boolean;
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { showStagingData, setShowStagingData } = useStagingDataFilter();
  const { deletedBackups, error, loadTrash } = useUsersTrash();

  useEffect(() => {
    if (filter === "trash") void loadTrash();
  }, [filter, loadTrash]);

  const { filteredUsers, stagingDataCount } = useUsersFilter(
    users,
    filter,
    search,
    showStagingData,
  );
  const {
    isLoading: actionLoading,
    error: actionError,
    handleAction,
  } = useUserActions();

  // Use action error if it exists, otherwise use trash error
  const displayError = actionError || error;

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
      {displayError && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <p className="text-red-700 dark:text-red-300 text-sm">
            {displayError}
          </p>
        </div>
      )}

      <div className="mb-4">
        <StagingDataToggle
          showStagingData={showStagingData}
          onToggle={setShowStagingData}
          hiddenCount={!showStagingData ? stagingDataCount : undefined}
        />
      </div>

      <Tabs
        value={filter}
        onValueChange={(value) => {
          setFilter(value as FilterTab);
          setSelectedIds(new Set());
        }}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="all">Tutti ({users.length})</TabsTrigger>
          <TabsTrigger value="active">Attivi</TabsTrigger>
          <TabsTrigger value="disabled">Disabilitati</TabsTrigger>
          <TabsTrigger value="trash">
            Cestino ({deletedBackups.length})
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
                    isLoading={actionLoading === b.userId}
                    onRestore={() =>
                      handleAction(b.userId, "restore", undefined, loadTrash)
                    }
                  />
                ))
              : filteredUsers.map((user) => (
                  <UsersTableRow
                    key={user.id}
                    user={user}
                    isSelected={selectedIds.has(user.id)}
                    isLoading={actionLoading === user.id}
                    onSelect={() => toggleSelect(user.id)}
                    onToggle={() =>
                      handleAction(user.id, "toggle", user.disabled, loadTrash)
                    }
                    onDelete={() =>
                      handleAction(user.id, "delete", undefined, loadTrash)
                    }
                    availableTiers={availableTiers}
                  />
                ))}
          </TableBody>
        </Table>

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
