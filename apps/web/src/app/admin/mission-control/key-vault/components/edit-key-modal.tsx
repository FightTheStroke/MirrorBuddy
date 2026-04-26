"use client";

/**
 * Edit Key Modal Component
 * Form for updating existing secrets
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { csrfFetch } from "@/lib/auth";
import type { MaskedSecretVaultEntry } from "@/lib/admin/key-vault-types";
import { useTranslations } from "next-intl";

interface EditKeyModalProps {
  secret: MaskedSecretVaultEntry;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditKeyModal({
  secret,
  open,
  onClose,
  onSuccess,
}: EditKeyModalProps) {
  const t = useTranslations("admin");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState(secret.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const body: { value?: string; status?: string } = { status };
      if (value) {
        body.value = value;
      }

      const response = await csrfFetch(`/api/admin/key-vault/${secret.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update secret");
      }

      setValue("");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update secret");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editApiKey")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <p>{error}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="secret-service"
                className="block text-sm font-medium mb-2"
              >
                {t("service")}
              </label>
              <Input id="secret-service" value={secret.service} disabled />
            </div>

            <div>
              <label
                htmlFor="secret-key-name"
                className="block text-sm font-medium mb-2"
              >
                {t("keyName")}
              </label>
              <Input id="secret-key-name" value={secret.keyName} disabled />
            </div>

            <div>
              <label htmlFor="value" className="block text-sm font-medium mb-2">
                {t("newSecretValueOptional")}
              </label>
              <Input
                id="value"
                type="password"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={t("leaveEmptyToKeepCurrentValue")}
              />
            </div>

            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium mb-2"
              >
                {t("status")}
              </label>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value as "active" | "expired" | "rotated")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("active")}</SelectItem>
                  <SelectItem value="expired">{t("expired")}</SelectItem>
                  <SelectItem value="rotated">{t("rotated")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("updateSecret")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
