import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface CostConfigFormProps {
  onSave: (config: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    subscriptionId: string;
  }) => Promise<void>;
}

export function CostConfigForm({ onSave }: CostConfigFormProps) {
  const t = useTranslations('settings.aiProviderSettings');
  const [azureCostConfig, setAzureCostConfig] = useState({
    tenantId: '',
    clientId: '',
    clientSecret: '',
    subscriptionId: '',
  });
  const [savingCostConfig, setSavingCostConfig] = useState(false);
  const [costConfigSaved, setCostConfigSaved] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/user/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.azureCostConfig) {
            const parsed = JSON.parse(data.azureCostConfig);
            setAzureCostConfig(parsed);
            setCostConfigSaved(true);
          }
        }
      } catch {
        // Failed to load, ignore
      }
    };
    loadConfig();
  }, []);

  const saveCostConfig = async () => {
    setSavingCostConfig(true);
    try {
      await onSave(azureCostConfig);
      setCostConfigSaved(true);
    } finally {
      setSavingCostConfig(false);
    }
  };

  return (
    <div className="space-y-3 mb-4">
      <input
        type="text"
        placeholder="AZURE_TENANT_ID"
        value={azureCostConfig.tenantId}
        onChange={(e) => setAzureCostConfig((prev) => ({ ...prev, tenantId: e.target.value }))}
        className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="text"
        placeholder="AZURE_CLIENT_ID"
        value={azureCostConfig.clientId}
        onChange={(e) => setAzureCostConfig((prev) => ({ ...prev, clientId: e.target.value }))}
        className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="password"
        placeholder="AZURE_CLIENT_SECRET"
        value={azureCostConfig.clientSecret}
        onChange={(e) => setAzureCostConfig((prev) => ({ ...prev, clientSecret: e.target.value }))}
        className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="text"
        placeholder="AZURE_SUBSCRIPTION_ID"
        value={azureCostConfig.subscriptionId}
        onChange={(e) =>
          setAzureCostConfig((prev) => ({ ...prev, subscriptionId: e.target.value }))
        }
        className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <Button
        onClick={saveCostConfig}
        disabled={
          savingCostConfig ||
          !azureCostConfig.tenantId ||
          !azureCostConfig.clientId ||
          !azureCostConfig.clientSecret ||
          !azureCostConfig.subscriptionId
        }
        className="w-full"
      >
        {savingCostConfig
          ? t('saving')
          : costConfigSaved
            ? t('configurationSaved')
            : t('saveConfiguration')}
      </Button>
      {costConfigSaved && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 mb-3">
          <p className="text-sm text-green-700 dark:text-green-400">{t('savedLocallyMessage')}</p>
        </div>
      )}
      <div className="bg-slate-900 dark:bg-slate-950 p-3 rounded-lg">
        <p className="text-xs text-slate-400 mb-2">{t('envVariablesRequired')}</p>
        <code className="text-xs text-green-400 font-mono block leading-relaxed">
          AZURE_TENANT_ID=...
          <br />
          AZURE_CLIENT_ID=...
          <br />
          AZURE_CLIENT_SECRET=...
          <br />
          AZURE_SUBSCRIPTION_ID=...
        </code>
      </div>
    </div>
  );
}
