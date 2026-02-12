// ============================================================================
// SSO CONFIGURATION UI (T2-04)
// School admin panel for configuring Google/Microsoft SSO
// Created for F-06: School Admin Self-Service SSO Configuration
// ============================================================================

'use client';

import { useState, useCallback } from 'react';
import { csrfFetch } from '@/lib/auth';
import { clientLogger as logger } from '@/lib/logger/client';
import { useTranslations } from 'next-intl';

interface SSOProviderConfig {
  provider: 'google' | 'microsoft';
  tenantId: string;
  domain: string;
  clientId: string;
  clientSecret: string;
  enabled: boolean;
}

interface SSOConfigPanelProps {
  schoolId: string;
  existingConfigs?: SSOProviderConfig[];
}

const PROVIDER_LABELS = {
  google: 'Google Workspace',
  microsoft: 'Microsoft 365',
} as const;

export function SSOConfigPanel({ schoolId, existingConfigs = [] }: SSOConfigPanelProps) {
  const t = useTranslations('admin');
  const [configs, _setConfigs] = useState<SSOProviderConfig[]>(existingConfigs);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = useCallback(
    async (config: SSOProviderConfig) => {
      setSaving(true);
      setError(null);
      setSuccess(null);

      try {
        const response = await csrfFetch('/api/admin/sso/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId, ...config }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to save SSO configuration');
        }

        setSuccess(`${PROVIDER_LABELS[config.provider]} SSO configuration saved`);
        logger.info('[SSO Config] Saved', {
          provider: config.provider,
          schoolId,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save';
        setError(message);
        logger.error('[SSO Config] Save failed', undefined, err);
      } finally {
        setSaving(false);
      }
    },
    [schoolId],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t('singleSignOnConfiguration')}</h2>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {success}
        </div>
      )}

      {(['google', 'microsoft'] as const).map((provider) => (
        <SSOProviderForm
          key={provider}
          provider={provider}
          config={configs.find((c) => c.provider === provider)}
          onSave={handleSave}
          saving={saving}
        />
      ))}
    </div>
  );
}

interface SSOProviderFormProps {
  provider: 'google' | 'microsoft';
  config?: SSOProviderConfig;
  onSave: (config: SSOProviderConfig) => Promise<void>;
  saving: boolean;
}

function SSOProviderForm({ provider, config, onSave, saving }: SSOProviderFormProps) {
  const t = useTranslations('admin');
  const [tenantId, setTenantId] = useState(config?.tenantId || '');
  const [domain, setDomain] = useState(config?.domain || '');
  const [clientId, setClientId] = useState(config?.clientId || '');
  const [clientSecret, setClientSecret] = useState('');
  const [enabled, setEnabled] = useState(config?.enabled ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      provider,
      tenantId,
      domain,
      clientId,
      clientSecret,
      enabled,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium">{PROVIDER_LABELS[provider]}</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded border-gray-300"
          />
          {t('enabled')}
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {provider === 'microsoft' && (
          <div>
            <label htmlFor={`${provider}-tenant`} className="mb-1 block text-sm font-medium">
              {t('azureAdTenantId')}
            </label>
            <input
              id={`${provider}-tenant`}
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder={t('xxxxxxxxXxxxXxxxXxxxXxxxxxxxxxxx')}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
        )}

        <div>
          <label htmlFor={`${provider}-domain`} className="mb-1 block text-sm font-medium">
            {t('schoolDomain')}
          </label>
          <input
            id={`${provider}-domain`}
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder={t('schoolEdu')}
            required
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor={`${provider}-clientid`} className="mb-1 block text-sm font-medium">
            {t('clientId')}
          </label>
          <input
            id={`${provider}-clientid`}
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor={`${provider}-secret`} className="mb-1 block text-sm font-medium">
            {t('clientSecret')}
          </label>
          <input
            id={`${provider}-secret`}
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder={config ? '••••••••' : 'Enter secret'}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </form>
  );
}
