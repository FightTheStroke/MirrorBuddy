"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Trash2, Lock, Unlock, X, RefreshCw } from "lucide-react";
import { csrfFetch } from "@/lib/auth/csrf-client";
import { BulkTierChangeModal } from "@/components/admin/bulk-tier-change-modal";

interface Tier {
  id: string;
  code: string;
  name: string;
}

interface User {
  id: string;
  username: string | null;
  email: string | null;
}

interface UsersBulkActionsProps {
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onActionComplete: () => void;
  users?: User[];
  availableTiers?: Tier[];
}

export function UsersBulkActions({
  selectedIds,
  onClearSelection,
  onActionComplete,
  users = [],
  availableTiers = [],
}: UsersBulkActionsProps) {
  const t = useTranslations("admin.users.bulkActions");
  const [isLoading, setIsLoading] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);
  const count = selectedIds.size;

  if (count === 0) return null;

  // Get selected users for the tier change modal
  const selectedUsers = users.filter((u) => selectedIds.has(u.id));

  const handleBulkDisable = async () => {
    if (!confirm(t("confirmDisable", { count: String(count) }))) return;
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
    if (!confirm(t("confirmEnable", { count: String(count) }))) return;
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
    if (!confirm(t("confirmDelete", { count: String(count) }))) return;
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
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-3 px-4 py-3 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl">
          <span className="text-sm font-medium">
            {count} {t("selected")}
          </span>
          <div className="h-4 w-px bg-border" />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowTierModal(true)}
            disabled={isLoading}
            className="hover:bg-accent"
            aria-label="Change tier for selected users"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            {t("changeTier")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleBulkEnable}
            disabled={isLoading}
            className="hover:bg-accent"
          >
            <Unlock className="w-4 h-4 mr-1" />
            {t("enable")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleBulkDisable}
            disabled={isLoading}
            className="hover:bg-accent"
          >
            <Lock className="w-4 h-4 mr-1" />
            {t("disable")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleBulkDelete}
            disabled={isLoading}
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {t("delete")}
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

      {/* Bulk Tier Change Modal - lazy load */}
      {showTierModal && selectedUsers.length > 0 && (
        <BulkTierChangeModal
          isOpen={showTierModal}
          onClose={() => setShowTierModal(false)}
          onSuccess={() => {
            setShowTierModal(false);
            onClearSelection();
            onActionComplete();
          }}
          users={selectedUsers}
          availableTiers={availableTiers}
        />
      )}
    </>
  );
}
