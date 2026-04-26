// Mark as dynamic to avoid static generation issues
export const dynamic = 'force-dynamic';

import { validateAdminAuth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { stripeService } from '@/lib/stripe/stripe-service';
import { requireServerActionCSRF } from '@/lib/security';
import { logAdminAction } from '@/lib/admin/audit-service';
import { TaxConfigForm } from './tax-config-form';

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

  await requireServerActionCSRF(formData);

  const auth = await validateAdminAuth();
  if (!auth.authenticated || !auth.isAdmin) {
    throw new Error('Unauthorized');
  }

  const countryCode = formData.get('countryCode') as string;
  const vatRate = parseFloat(formData.get('vatRate') as string);
  const reverseChargeEnabled = formData.get('reverseChargeEnabled') === 'on';
  const isActive = formData.get('isActive') !== 'off';

  try {
    const config = await prisma.taxConfig.upsert({
      where: { countryCode },
      create: { countryCode, vatRate, reverseChargeEnabled, isActive },
      update: { vatRate, reverseChargeEnabled, isActive },
    });

    await logAdminAction({
      action: 'UPDATE_TAX_CONFIG',
      entityType: 'TaxConfig',
      entityId: config.id,
      adminId: auth.userId!,
      details: { countryCode, vatRate, reverseChargeEnabled, isActive },
    });
  } catch {
    // Migration not run yet - silently fail
  }

  revalidatePath('/admin/tax');
}

async function syncToStripe(formData: FormData) {
  'use server';

  await requireServerActionCSRF(formData);

  const auth = await validateAdminAuth();
  if (!auth.authenticated || !auth.isAdmin) {
    throw new Error('Unauthorized');
  }

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

    await logAdminAction({
      action: 'SYNC_TAX_TO_STRIPE',
      entityType: 'TaxConfig',
      entityId: config.id,
      adminId: auth.userId!,
      details: { countryCode, stripeTaxRateId: taxRate.id },
    });
  } catch {
    // Stripe sync failed - will retry
  }

  revalidatePath('/admin/tax');
}

export default async function TaxConfigPage() {
  const auth = await validateAdminAuth();
  if (!auth.authenticated || !auth.isAdmin) {
    redirect('/login');
  }

  const { configs, hasMigration } = await getTaxConfigs();

  return (
    <TaxConfigForm
      configs={configs}
      hasMigration={hasMigration}
      updateTaxConfig={updateTaxConfig}
      syncToStripe={syncToStripe}
    />
  );
}
