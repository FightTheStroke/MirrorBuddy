/**
 * Tier Pricing & Stripe Sync
 * Task: T1-13 (F-28)
 */
 

import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import Stripe from "stripe";
import { getTranslations } from "next-intl/server";

// Lazy init Stripe to avoid build-time errors
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-01-28.clover",
  });
}

export const metadata = {
  title: "Tier Pricing | Admin",
};

interface Props {
  params: Promise<{ id: string }>;
}

async function getTier(id: string) {
  const tier = await prisma.tierDefinition.findUnique({ where: { id } });
  if (!tier) notFound();
  return tier;
}

async function updatePricing(formData: FormData) {
  "use server";

  const id = formData.get("id") as string;
  const monthlyPrice = parseFloat(formData.get("monthlyPriceEur") as string);
  const currency = (formData.get("currency") as string) || "eur";
  const billingInterval =
    (formData.get("billingInterval") as string) || "month";
  const syncToStripe = formData.get("syncToStripe") === "on";

  const tier = await prisma.tierDefinition.findUnique({ where: { id } });
  if (!tier) throw new Error("Tier not found");

  let newStripePriceId = tier.stripePriceId;

  if (syncToStripe && monthlyPrice > 0) {
    try {
      // Create or get product in Stripe
      let stripeProductId: string;

      const stripeClient = getStripe();
      const existingProducts = await stripeClient.products.search({
        query: `metadata['tier_code']:'${tier.code}'`,
      });

      if (existingProducts.data.length > 0) {
        stripeProductId = existingProducts.data[0].id;
      } else {
        const product = await stripeClient.products.create({
          name: tier.name,
          description: tier.description || undefined,
          metadata: { tier_code: tier.code, tier_id: tier.id },
        });
        stripeProductId = product.id;
      }

      // Archive old price if exists
      if (tier.stripePriceId) {
        await stripeClient.prices.update(tier.stripePriceId, { active: false });
      }

      // Create new price
      const newPrice = await stripeClient.prices.create({
        product: stripeProductId,
        unit_amount: Math.round(monthlyPrice * 100),
        currency,
        recurring: {
          interval: billingInterval as "month" | "year",
        },
        metadata: { tier_code: tier.code, tier_id: tier.id },
      });

      newStripePriceId = newPrice.id;
    } catch (_error) {
      // Stripe sync failed - error logged server-side
      throw new Error("Failed to sync with Stripe");
    }
  }

  await prisma.tierDefinition.update({
    where: { id },
    data: {
      monthlyPriceEur: monthlyPrice || null,
      stripePriceId: newStripePriceId,
    },
  });

  await prisma.tierAuditLog.create({
    data: {
      tierId: id,
      action: "TIER_UPDATE",
      adminId: "system",
      changes: {
        pricing: { monthlyPrice, currency, billingInterval },
        stripeSynced: syncToStripe,
        stripePriceId: newStripePriceId,
      },
      notes: "Pricing updated",
    },
  });

  revalidatePath("/admin/tiers");
  revalidatePath(`/admin/tiers/${id}/pricing`);
  redirect(`/admin/tiers/${id}/pricing`);
}

export default async function TierPricingPage({ params }: Props) {
  const t = await getTranslations("admin");
  const { id } = await params;
  const tier = await getTier(id);

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href="/admin/tiers"
          className="text-sm text-indigo-600 hover:text-indigo-900"
        >
          {t("backToTiers")}
        </Link>
      </div>

      <h1 className="mb-2 text-3xl font-bold">{t("pricing")} {tier.name}</h1>
      <p className="mb-6 text-gray-600">
        {t("configurePricingAndSyncWithStripe")}
      </p>

      <form action={updatePricing} className="max-w-2xl space-y-6">
        <input type="hidden" name="id" value={tier.id} />

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-medium">{t("currentPricing")}</h2>

          <div className="mb-4 rounded-md bg-gray-50 p-4">
            <div className="grid gap-2 text-sm">
              <div>
                <span className="font-medium">{t("currentPrice")}</span>{" "}
                {tier.monthlyPriceEur
                  ? `€${Number(tier.monthlyPriceEur).toFixed(2)}/month`
                  : "Free"}
              </div>
              <div>
                <span className="font-medium">{t("stripePriceId")}</span>{" "}
                <code className="rounded bg-gray-200 px-1 text-xs">
                  {tier.stripePriceId || "Not synced"}
                </code>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("monthlyPriceEur")}
              </label>
              <input
                type="number"
                name="monthlyPriceEur"
                step="0.01"
                min="0"
                defaultValue={tier.monthlyPriceEur?.toString() || ""}
                placeholder={t("k000ForFreeTier")}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("currency")}
              </label>
              <select
                name="currency"
                defaultValue="eur"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              >
                <option value="eur">{t("eur")}</option>
                <option value="usd">{t("usd")}</option>
                <option value="gbp">{t("gbp")}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("billingInterval")}
              </label>
              <select
                name="billingInterval"
                defaultValue="month"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              >
                <option value="month">{t("monthly")}</option>
                <option value="year">{t("yearly")}</option>
              </select>
            </div>

            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                name="syncToStripe"
                id="syncToStripe"
                defaultChecked
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label
                htmlFor="syncToStripe"
                className="ml-2 text-sm text-gray-700"
              >
                {t("syncToStripeCreatesNewPriceArchivesOld")}
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <h3 className="text-sm font-medium text-yellow-800">{t("important")}</h3>
          <p className="mt-1 text-sm text-yellow-700">
            {t("changingThePriceWillCreateANewStripePriceAndArchiv")}
            {t("oldOneExistingSubscriptionsWillContinueAtTheirCurr")}

          </p>
        </div>

        <div className="flex justify-end gap-4">
          <Link
            href="/admin/tiers"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t("cancel")}
          </Link>
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {t("updatePricing")}
          </button>
        </div>
      </form>
    </div>
  );
}
