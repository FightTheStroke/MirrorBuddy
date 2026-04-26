'use client';

import { useTranslations } from 'next-intl';
import { CSRFTokenInput } from '@/components/csrf-token-input';

interface TaxConfigItem {
  id: string | null;
  countryCode: string;
  countryName: string;
  vatRate: number;
  reverseChargeEnabled: boolean;
  isActive: boolean;
  stripeTaxId: string | null;
}

interface TaxConfigFormProps {
  configs: TaxConfigItem[];
  hasMigration: boolean;
  updateTaxConfig: (formData: FormData) => Promise<void>;
  syncToStripe: (formData: FormData) => Promise<void>;
}

export function TaxConfigForm({
  configs,
  hasMigration,
  updateTaxConfig,
  syncToStripe,
}: TaxConfigFormProps) {
  const t = useTranslations('admin.tax');

  return (
    <>
      <p className="mb-6 text-gray-600 dark:text-gray-400">{t('pageDescription')}</p>

      {!hasMigration && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20 p-4">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            {t('migrationRequired')}
          </h3>
          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
            {t('migrationInstructions')}
          </p>
        </div>
      )}
      <div className="rounded-lg bg-white dark:bg-gray-800 shadow">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('country')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('vatRate')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('reverseCharge')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('stripe')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {configs.map((config) => (
              <tr key={config.countryCode}>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center">
                    <span className="mr-2 text-xl">
                      {config.countryCode === 'IT' && '🇮🇹'}
                      {config.countryCode === 'FR' && '🇫🇷'}
                      {config.countryCode === 'DE' && '🇩🇪'}
                      {config.countryCode === 'ES' && '🇪🇸'}
                      {config.countryCode === 'GB' && '🇬🇧'}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {config.countryName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {config.countryCode}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <form action={updateTaxConfig} className="flex items-center gap-2">
                    <CSRFTokenInput />
                    <input type="hidden" name="countryCode" value={config.countryCode} />
                    <input
                      type="hidden"
                      name="reverseChargeEnabled"
                      value={config.reverseChargeEnabled ? 'on' : ''}
                    />
                    <input
                      type="number"
                      name="vatRate"
                      defaultValue={config.vatRate}
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-20 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm"
                    />
                    <span className="text-gray-500 dark:text-gray-400">{t('percentSymbol')}</span>
                    <button
                      type="submit"
                      disabled={!hasMigration}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 disabled:text-gray-400 dark:disabled:text-gray-600"
                    >
                      {t('save')}
                    </button>
                  </form>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <form action={updateTaxConfig}>
                    <CSRFTokenInput />
                    <input type="hidden" name="countryCode" value={config.countryCode} />
                    <input type="hidden" name="vatRate" value={config.vatRate} />
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="reverseChargeEnabled"
                        defaultChecked={config.reverseChargeEnabled}
                        disabled={!hasMigration}
                        onChange={(e) => e.target.form?.requestSubmit()}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 dark:text-indigo-400 disabled:opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                        {t('b2b')}
                      </span>
                    </label>
                  </form>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${config.isActive ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
                  >
                    {config.isActive ? t('active') : t('inactive')}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {config.stripeTaxId ? (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      {t('synced')}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {t('notSynced')}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <form action={syncToStripe}>
                    <CSRFTokenInput />
                    <input type="hidden" name="countryCode" value={config.countryCode} />
                    <button
                      type="submit"
                      disabled={!hasMigration}
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 disabled:text-gray-400 dark:disabled:text-gray-600"
                    >
                      {t('syncToStripe')}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-4">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
          {t('euVatCompliance')}
        </h3>
        <ul className="mt-2 list-inside list-disc text-sm text-blue-700 dark:text-blue-300">
          <li>{t('reverseChargeInfo')}</li>
          <li>{t('standardRatesInfo')}</li>
          <li>{t('ukRatesInfo')}</li>
        </ul>
      </div>
    </>
  );
}
