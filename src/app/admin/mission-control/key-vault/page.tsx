/**
 * Key Vault Admin Page
 * Secure management interface for API keys and credentials
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Key, AlertCircle } from 'lucide-react';
import { KeyVaultTable } from './components/key-vault-table';
import { AddKeyModal } from './components/add-key-modal';
import { EditKeyModal } from './components/edit-key-modal';
import { DeleteKeyModal } from './components/delete-key-modal';
import type { MaskedSecretVaultEntry } from '@/lib/admin/key-vault-types';

export const dynamic = 'force-dynamic';

interface StructuredError {
  error: string;
  message: string;
}

export default function KeyVaultPage() {
  const [secrets, setSecrets] = useState<MaskedSecretVaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSecret, setEditingSecret] = useState<MaskedSecretVaultEntry | null>(null);
  const [deletingSecret, setDeletingSecret] = useState<MaskedSecretVaultEntry | null>(null);

  const fetchSecrets = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorType(null);
      const response = await fetch('/api/admin/key-vault');

      if (!response.ok) {
        const data = (await response.json()) as StructuredError;
        if (data.error && data.message) {
          setError(data.message);
          setErrorType(data.error);
        } else {
          throw new Error('Failed to fetch secrets');
        }
        return;
      }

      const data = await response.json();
      setSecrets(data.secrets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch secrets');
      setErrorType('unknown');
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
          <h1 className="text-3xl font-bold tracking-tight">Key Vault</h1>
          <p className="text-muted-foreground">
            Secure encrypted storage for API keys and credentials
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Key
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Stored Credentials
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && errorType === 'encryption_not_configured' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-4 text-blue-900 border border-blue-200">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">Encryption Not Configured</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-medium">Setup instructions:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Generate a secure 32-character encryption key</li>
                  <li>
                    Add <code className="bg-muted px-1 rounded">TOKEN_ENCRYPTION_KEY</code> to
                    Vercel environment variables
                  </li>
                  <li>Redeploy the application</li>
                </ol>
              </div>
            </div>
          )}

          {error && errorType === 'database_error' && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-destructive border border-destructive/20">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-semibold">Database Connection Error</p>
                <p className="text-sm mt-1">{error}</p>
                <p className="text-sm mt-2 text-muted-foreground">
                  Please check database connection and try again.
                </p>
              </div>
            </div>
          )}

          {error && errorType === 'decryption_failed' && (
            <div className="flex items-center gap-2 rounded-lg bg-yellow-50 p-4 text-yellow-900 border border-yellow-200">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-semibold">Decryption Failed</p>
                <p className="text-sm mt-1">{error}</p>
                <p className="text-sm mt-2 text-yellow-700">
                  The encryption key may have changed. Contact system administrator.
                </p>
              </div>
            </div>
          )}

          {error && errorType === 'key_not_found' && (
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-4 text-gray-700 border border-gray-200">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-semibold">Key Not Found</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {error && errorType === 'internal_error' && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-destructive border border-destructive/20">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-semibold">Internal Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {error && errorType === 'unknown' && (
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
