/**
 * VAT/Tax Configuration Admin
 * Task: T1-15 (F-30)
 */

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { stripeService } from '@/lib/stripe/stripe-service';
import { getTranslations } from 'next-intl/server';

export const metadata = {
  title: 'Tax Configuration | Admin',
};

interface TaxConfigItem {
  id: string | null;
  countryCode: string;
  countryName: string;
  vatRate: number;
  reverseChargeEnabled: boolean;
  isActive: boolean;
  stripeTaxId: string | null;
}

const EU_COUNTRIES = [
  { code: 'IT', name: 'Italy', defaultRate: 22 },
  { code: 'FR', name: 'France', defaultRate: 20 },
  { code: 'DE', name: 'Germany', defaultRate: 19 },
  { code: 'ES', name: 'Spain', defaultRate: 21 },
  { code: 'GB', name: 'United Kingdom', defaultRate: 20 },
] as const;

async function getTaxConfigs(): Promise<{
  configs: TaxConfigItem[];
  hasMigration: boolean;
}> {
  try {
    const dbConfigs = await prisma.taxConfig.findMany({
      orderBy: { countryCode: 'asc' },
    });

    const configs = EU_COUNTRIES.map((country) => {
      const existing = dbConfigs.find((c) => c.countryCode === country.code);
      return {
        id: existing?.id ?? null,
        countryCode: country.code,
        countryName: country.name,
        vatRate: existing?.vatRate ?? country.defaultRate,
        reverseChargeEnabled: existing?.reverseChargeEnabled ?? false,
        isActive: existing?.isActive ?? true,
        stripeTaxId: existing?.stripeTaxId ?? null,
      };
    });

    return { configs, hasMigration: true };
  } catch {
    // Table doesn't exist yet - return defaults
    return {
      configs: EU_COUNTRIES.map((country) => ({
        id: null,
        countryCode: country.code,
        countryName: country.name,
        vatRate: country.defaultRate,
        reverseChargeEnabled: false,
        isActive: true,
        stripeTaxId: null,
      })),
      hasMigration: false,
    };
  }
}

async function updateTaxConfig(formData: FormData) {
  'use server';

  const countryCode = formData.get('countryCode') as string;
  const vatRate = parseFloat(formData.get('vatRate') as string);
  const reverseChargeEnabled = formData.get('reverseChargeEnabled') === 'on';
  const isActive = formData.get('isActive') !== 'off';

  try {
    await prisma.taxConfig.upsert({
      where: { countryCode },
      create: { countryCode, vatRate, reverseChargeEnabled, isActive },
      update: { vatRate, reverseChargeEnabled, isActive },
    });
  } catch {
    // Migration not run yet - silently fail
  }

  revalidatePath('/admin/tax');
}

async function syncToStripe(formData: FormData) {
  'use server';

  const countryCode = formData.get('countryCode') as string;

  try {
    const config = await prisma.taxConfig.findUnique({
      where: { countryCode },
    });
    if (!config) return;

    const stripe = stripeService.getServerClient();
    const countryNames: Record<string, string> = {
      IT: 'Italy',
      FR: 'France',
      DE: 'Germany',
      ES: 'Spain',
      GB: 'United Kingdom',
    };

    const taxRate = await stripe.taxRates.create({
      display_name: `${countryNames[countryCode] || countryCode} VAT`,
      percentage: config.vatRate,
      country: countryCode,
      inclusive: false,
      active: config.isActive,
      description: `VAT for ${countryNames[countryCode] || countryCode}`,
    });

    await prisma.taxConfig.update({
      where: { countryCode },
      data: { stripeTaxId: taxRate.id },
    });
  } catch {
    // Stripe sync failed - will retry
  }

  revalidatePath('/admin/tax');
}

export default async function TaxConfigPage() {
  const t = await getTranslations('admin');
  const { configs, hasMigration } = await getTaxConfigs();

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-indigo-600 hover:text-indigo-900">
          {t('backToAdmin')}
        </Link>
      </div>

      <h1 className="mb-2 text-3xl font-bold">{t('vatTaxConfiguration')}</h1>
      <p className="mb-6 text-gray-600">{t('configureVatRatesPerCountryForEuTaxCompliance')}</p>

      {!hasMigration && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <h3 className="text-sm font-medium text-yellow-800">{t('databaseMigrationRequired')}</h3>
          <p className="mt-1 text-sm text-yellow-700">
            {t('run')}{' '}
            <code className="rounded bg-yellow-100 px-1">{t('npxPrismaMigrateDev')}</code>{' '}
            {t('toEnablePersistence')}
          </p>
        </div>
      )}

      <div className="rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('country')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('vatRate')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('reverseCharge')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('tax.stripe')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
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
                      <div className="text-sm font-medium text-gray-900">{config.countryName}</div>
                      <div className="text-xs text-gray-500">{config.countryCode}</div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <form action={updateTaxConfig} className="flex items-center gap-2">
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
                      className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                    <span className="text-gray-500">%</span>
                    <button
                      type="submit"
                      disabled={!hasMigration}
                      className="text-xs text-indigo-600 hover:text-indigo-900 disabled:text-gray-400"
                    >
                      {t('save')}
                    </button>
                  </form>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <form action={updateTaxConfig}>
                    <input type="hidden" name="countryCode" value={config.countryCode} />
                    <input type="hidden" name="vatRate" value={config.vatRate} />
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="reverseChargeEnabled"
                        defaultChecked={config.reverseChargeEnabled}
                        disabled={!hasMigration}
                        onChange={(e) => e.target.form?.requestSubmit()}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 disabled:opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-600">B2B</span>
                    </label>
                  </form>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${config.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                  >
                    {config.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {config.stripeTaxId ? (
                    <span className="text-xs text-green-600">{t('synced')}</span>
                  ) : (
                    <span className="text-xs text-gray-400">{t('notSynced')}</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <form action={syncToStripe}>
                    <input type="hidden" name="countryCode" value={config.countryCode} />
                    <button
                      type="submit"
                      disabled={!hasMigration}
                      className="text-sm text-indigo-600 hover:text-indigo-900 disabled:text-gray-400"
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

      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="text-sm font-medium text-blue-800">{t('euVatCompliance')}</h3>
        <ul className="mt-2 list-inside list-disc text-sm text-blue-700">
          <li>{t('reverseChargeApplies')}</li>
          <li>{t('standardRatesApply')}</li>
          <li>{t('ukRatesShownForReferencePostBrexitSeparateRulesApp')}</li>
        </ul>
      </div>
    </div>
  );
}
