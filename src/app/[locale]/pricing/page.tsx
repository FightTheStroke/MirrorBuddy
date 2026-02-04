/**
 * Pricing Page - Tier comparison and subscription CTAs
 * Responsive, i18n-enabled, Tailwind styled
 */

import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { prisma } from "@/lib/db";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "pricing",
  });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

async function getTiers() {
  const tiers = await prisma.tierDefinition.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return tiers;
}

export default async function PricingPage() {
  const tiers = await getTiers();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <PricingHeader />
        <div className="mt-12 grid gap-8 lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
          {tiers.map((tier) => (
            <TierCard key={tier.id} tier={tier} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PricingHeader() {
  const t = useTranslations("pricing");
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
        {t("title")}
      </h1>
      <p className="mt-4 text-lg text-gray-600">{t("subtitle")}</p>
    </div>
  );
}

function TierCard({
  tier,
}: {
  tier: {
    code: string;
    name: string;
    stripePriceId: string | null;
    monthlyPriceEur: unknown;
  };
}) {
  const t = useTranslations("pricing");
  const tierKey = tier.code as "trial" | "base" | "pro";
  const isPro = tier.code === "pro";

  const price = tier.monthlyPriceEur
    ? `€${Number(tier.monthlyPriceEur).toFixed(2)}`
    : t(`tiers.${tierKey}.price`);

  return (
    <div
      className={`relative rounded-2xl bg-white p-8 shadow-xl ring-1 ${
        isPro ? "ring-indigo-600 ring-2" : "ring-gray-200"
      }`}
    >
      {isPro && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-sm font-semibold text-white">
          Popular
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900">
          {t(`tiers.${tierKey}.name`)}
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          {t(`tiers.${tierKey}.description`)}
        </p>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold text-gray-900">{price}</span>
        {isPro && (
          <span className="text-gray-600">{t(`tiers.${tierKey}.period`)}</span>
        )}
      </div>

      <ul className="mb-8 space-y-3">
        {[0, 1, 2, 3, 4, 5, 6].map((idx) => {
          try {
            const feature = t(`tiers.${tierKey}.features.${idx}`);
            return (
              <li key={idx} className="flex items-start gap-3">
                <svg
                  className="mt-1 h-5 w-5 flex-shrink-0 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm text-gray-700">{feature}</span>
              </li>
            );
          } catch {
            return null;
          }
        })}
      </ul>

      <TierCTA tier={tier} tierKey={tierKey} />
    </div>
  );
}

function TierCTA({
  tier,
  tierKey,
}: {
  tier: { code: string; stripePriceId: string | null };
  tierKey: "trial" | "base" | "pro";
}) {
  const t = useTranslations("pricing");
  const isPro = tier.code === "pro";

  if (!isPro) {
    return (
      <Link
        href="/auth/signup"
        className="block w-full rounded-lg bg-gray-100 px-4 py-3 text-center text-sm font-semibold text-gray-900 hover:bg-gray-200"
      >
        {t(`tiers.${tierKey}.cta`)}
      </Link>
    );
  }

  return (
    <form action="/api/checkout" method="POST">
      <input type="hidden" name="priceId" value={tier.stripePriceId || ""} />
      <button
        type="submit"
        className="block w-full rounded-lg bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-indigo-700"
      >
        {t(`tiers.${tierKey}.cta`)}
      </button>
    </form>
  );
}
