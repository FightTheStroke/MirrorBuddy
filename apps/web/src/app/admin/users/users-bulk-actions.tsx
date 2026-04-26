"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Trash2, Lock, Unlock, X, RefreshCw, Loader2 } from "lucide-react";
import { csrfFetch } from "@/lib/auth";
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

interface BulkProgress {
  action: string;
  current: number;
  total: number;
  failed: number;
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
  const [progress, setProgress] = useState<BulkProgress | null>(null);
  const [showTierModal, setShowTierModal] = useState(false);
  const count = selectedIds.size;

  if (count === 0) return null;

  const selectedUsers = users.filter((u) => selectedIds.has(u.id));

  const executeBulkAction = async (
    actionName: string,
    ids: string[],
    executeFn: (id: string) => Promise<Response>,
  ) => {
    setIsLoading(true);
    setProgress({
      action: actionName,
      current: 0,
      total: ids.length,
      failed: 0,
    });

    let failed = 0;
    for (let i = 0; i < ids.length; i++) {
      try {
        const response = await executeFn(ids[i]);
        if (!response.ok) failed++;
      } catch {
        failed++;
      }
      setProgress({
        action: actionName,
        current: i + 1,
        total: ids.length,
        failed,
      });
    }

    setProgress(null);
    setIsLoading(false);

    if (failed > 0) {
      alert(
        t("partialFailure", {
          failed: String(failed),
          total: String(ids.length),
        }),
      );
    }

    onClearSelection();
    onActionComplete();
  };

  const handleBulkDisable = async () => {
    if (!confirm(t("confirmDisable", { count: String(count) }))) return;
    const ids = Array.from(selectedIds);
    await executeBulkAction(t("disabling"), ids, (id) =>
      fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: true }),
      }),
    );
  };

  const handleBulkEnable = async () => {
    if (!confirm(t("confirmEnable", { count: String(count) }))) return;
    const ids = Array.from(selectedIds);
    await executeBulkAction(t("enabling"), ids, (id) =>
      fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: false }),
      }),
    );
  };

  const handleBulkDelete = async () => {
    if (!confirm(t("confirmDelete", { count: String(count) }))) return;
    const ids = Array.from(selectedIds);
    await executeBulkAction(t("deleting"), ids, (id) =>
      csrfFetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        body: JSON.stringify({ reason: "bulk_admin_delete" }),
      }),
    );
  };

  return (
    <>
      {/* Progress overlay */}
      {progress && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center">
          <div className="bg-popover border border-border rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="font-medium">{progress.action}...</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {progress.current} / {progress.total}
                </span>
                <span>
                  {Math.round((progress.current / progress.total) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{
                    width: `${(progress.current / progress.total) * 100}%`,
                  }}
                />
              </div>
              {progress.failed > 0 && (
                <p className="text-xs text-destructive mt-2">
                  {progress.failed} {t("failed")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

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
            aria-label={t("changeTierForSelectedUsers")}
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
            disabled={isLoading}
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
