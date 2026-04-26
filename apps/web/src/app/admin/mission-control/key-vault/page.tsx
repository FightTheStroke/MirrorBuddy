/**
 * Key Vault Admin Page
 * Secure management interface for API keys and credentials
 */

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Key, AlertCircle } from "lucide-react";
import { KeyVaultTable } from "./components/key-vault-table";
import { AddKeyModal } from "./components/add-key-modal";
import { EditKeyModal } from "./components/edit-key-modal";
import { DeleteKeyModal } from "./components/delete-key-modal";
import type { MaskedSecretVaultEntry } from "@/lib/admin/key-vault-types";
import { useTranslations } from "next-intl";

export const dynamic = "force-dynamic";

interface StructuredError {
  error: string;
  message: string;
}

export default function KeyVaultPage() {
  const t = useTranslations("admin");
  const [secrets, setSecrets] = useState<MaskedSecretVaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSecret, setEditingSecret] =
    useState<MaskedSecretVaultEntry | null>(null);
  const [deletingSecret, setDeletingSecret] =
    useState<MaskedSecretVaultEntry | null>(null);

  const fetchSecrets = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorType(null);
      const response = await fetch("/api/admin/key-vault");

      if (!response.ok) {
        const data = (await response.json()) as StructuredError;
        if (data.error && data.message) {
          setError(data.message);
          setErrorType(data.error);
        } else {
          throw new Error("Failed to fetch secrets");
        }
        return;
      }

      const data = await response.json();
      setSecrets(data.secrets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch secrets");
      setErrorType("unknown");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSecrets();
  }, []);

  const handleSecretAdded = () => {
    setShowAddModal(false);
    void fetchSecrets();
  };

  const handleSecretUpdated = () => {
    setEditingSecret(null);
    void fetchSecrets();
  };

  const handleSecretDeleted = () => {
    setDeletingSecret(null);
    void fetchSecrets();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("keyVault")}</h1>
          <p className="text-muted-foreground">
            {t("secureEncryptedStorageForApiKeysAndCredentials")}
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addKey")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t("storedCredentials")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && errorType === "encryption_not_configured" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-4 text-blue-900 border border-blue-200">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">{t("encryptionNotConfigured")}</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-medium">{t("setupInstructions")}</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>{t("generateEncryptionKey")}</li>
                  <li>
                    {t("add")}{" "}
                    <code className="bg-muted px-1 rounded">
                      TOKEN_ENCRYPTION_KEY
                    </code>{" "}
                    {t("toVercelEnvironmentVariables")}
                  </li>
                  <li>{t("redeployTheApplication")}</li>
                </ol>
              </div>
            </div>
          )}

          {error && errorType === "internal_error" && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-destructive border border-destructive/20">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-semibold">{t("databaseConnectionError")}</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {error && errorType === "unknown" && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && (
            <KeyVaultTable
              secrets={secrets}
              onEdit={setEditingSecret}
              onDelete={setDeletingSecret}
            />
          )}
        </CardContent>
      </Card>

      <AddKeyModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleSecretAdded}
      />

      {editingSecret && (
        <EditKeyModal
          secret={editingSecret}
          open={true}
          onClose={() => setEditingSecret(null)}
          onSuccess={handleSecretUpdated}
        />
      )}

      {deletingSecret && (
        <DeleteKeyModal
          secret={deletingSecret}
          open={true}
          onClose={() => setDeletingSecret(null)}
          onSuccess={handleSecretDeleted}
        />
      )}
    </div>
  );
}
