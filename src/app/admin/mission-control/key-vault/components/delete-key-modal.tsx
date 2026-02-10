"use client";

/**
 * Delete Key Modal Component
 * Confirmation dialog for removing secrets
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { csrfFetch } from "@/lib/auth";
import type { MaskedSecretVaultEntry } from "@/lib/admin/key-vault-types";
import { useTranslations } from "next-intl";

interface DeleteKeyModalProps {
  secret: MaskedSecretVaultEntry;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteKeyModal({
  secret,
  open,
  onClose,
  onSuccess,
}: DeleteKeyModalProps) {
  const t = useTranslations("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await csrfFetch(`/api/admin/key-vault/${secret.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete secret");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete secret");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteApiKey")}</DialogTitle>
          <DialogDescription>
            {t("areYouSureYouWantToDeleteThisSecretThisActionCanno")}
            {t("undone")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p>{error}</p>
            </div>
          )}

          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm font-medium">{t("service")} {secret.service}</p>
            <p className="text-sm font-medium">{t("key")} {secret.keyName}</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("deleteSecret")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
