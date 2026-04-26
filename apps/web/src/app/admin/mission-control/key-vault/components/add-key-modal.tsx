"use client";

/**
 * Add Key Modal Component
 * Form for creating new encrypted secrets
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
import { Loader2, AlertCircle } from "lucide-react";
import { csrfFetch } from "@/lib/auth";
import { useTranslations } from "next-intl";

interface AddKeyModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddKeyModal({ open, onClose, onSuccess }: AddKeyModalProps) {
  const t = useTranslations("admin");
  const [service, setService] = useState("");
  const [keyName, setKeyName] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await csrfFetch("/api/admin/key-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, keyName, value }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add secret");
      }

      setService("");
      setKeyName("");
      setValue("");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add secret");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addApiKey")}</DialogTitle>
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
                htmlFor="service"
                className="block text-sm font-medium mb-2"
              >
                {t("service")}
              </label>
              <Input
                id="service"
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder={t("eGAzureOpenaiStripe")}
                required
              />
            </div>

            <div>
              <label
                htmlFor="keyName"
                className="block text-sm font-medium mb-2"
              >
                {t("keyName")}
              </label>
              <Input
                id="keyName"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder={t("eGAzureOpenaiApiKey")}
                required
              />
            </div>

            <div>
              <label htmlFor="value" className="block text-sm font-medium mb-2">
                {t("secretValue")}
              </label>
              <Input
                id="value"
                type="password"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={t("enterTheSecretValue")}
                required
              />
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
              {t("addSecret")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
