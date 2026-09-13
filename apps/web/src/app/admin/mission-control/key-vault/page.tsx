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
import { useTranslations } from 'next-intl';

export const dynamic = 'force-dynamic';

type KeyVaultErrorType =
  | 'encryption_not_configured'
  | 'database_error'
  | 'internal_error'
  | 'unknown';

export default function KeyVaultPage() {
  const t = useTranslations('admin');
  const tErrors = useTranslations('errors');
  const tLoading = useTranslations('common.ui.skeleton');
  const [secrets, setSecrets] = useState<MaskedSecretVaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState<KeyVaultErrorType | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSecret, setEditingSecret] = useState<MaskedSecretVaultEntry | null>(null);
  const [deletingSecret, setDeletingSecret] = useState<MaskedSecretVaultEntry | null>(null);

  const fetchSecrets = async () => {
    try {
      setLoading(true);
      setErrorType(null);
      const response = await fetch('/api/admin/key-vault');

      if (!response.ok) {
        const data: unknown = await response.json();
        const category =
          data && typeof data === 'object' && 'error' in data ? data.error : undefined;
        setErrorType(
          category === 'encryption_not_configured' ||
            category === 'database_error' ||
            category === 'internal_error'
            ? category
            : 'unknown',
        );
        return;
      }

      const data = (await response.json()) as {
        secrets?: MaskedSecretVaultEntry[];
      } | null;
      if (!Array.isArray(data?.secrets)) {
        throw new Error('Invalid key vault response');
      }
      setSecrets(data.secrets);
    } catch {
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
          <h1 className="text-3xl font-bold tracking-tight">{t('keyVault')}</h1>
          <p className="text-muted-foreground">
            {t('secureEncryptedStorageForApiKeysAndCredentials')}
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addKey')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t('storedCredentials')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div
              role="status"
              aria-label={tLoading('loading')}
              className="flex items-center justify-center py-12"
            >
              <Loader2
                aria-hidden="true"
                className="h-8 w-8 animate-spin motion-reduce:animate-none text-muted-foreground"
              />
            </div>
          )}

          {errorType && (
            <div className="space-y-4">
              <div
                role="alert"
                className={`flex items-center gap-2 rounded-lg p-4 border ${
                  errorType === 'encryption_not_configured'
                    ? 'bg-blue-50 text-blue-900 border-blue-200'
                    : 'bg-destructive/10 text-destructive border-destructive/20'
                }`}
              >
                <AlertCircle aria-hidden="true" className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">
                    {errorType === 'encryption_not_configured'
                      ? t('encryptionNotConfigured')
                      : errorType === 'database_error'
                        ? t('databaseConnectionError')
                        : errorType === 'internal_error'
                          ? tErrors('serverError')
                          : tErrors('generic')}
                  </p>
                  <p className="text-sm mt-1">{tErrors('errorPage.message')}</p>
                </div>
              </div>
              {errorType === 'encryption_not_configured' && (
                <div className="text-sm text-muted-foreground space-y-2">
                  <p className="font-medium">{t('setupInstructions')}</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>{t('generateEncryptionKey')}</li>
                    <li>
                      {t('add')} <code className="bg-muted px-1 rounded">TOKEN_ENCRYPTION_KEY</code>{' '}
                      {t('toVercelEnvironmentVariables')}
                    </li>
                    <li>{t('redeployTheApplication')}</li>
                  </ol>
                </div>
              )}
              <Button variant="outline" onClick={() => void fetchSecrets()}>
                {tErrors('retry')}
              </Button>
            </div>
          )}

          {!loading && !errorType && (
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
