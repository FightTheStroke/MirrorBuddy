/**
 * Create New Tier - Admin CRUD
 * Task: T1-11 (F-26)
 */
 

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Create Tier | Admin",
};

async function createTier(formData: FormData) {
  "use server";

  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const monthlyPrice = formData.get("monthlyPriceEur") as string;
  const chatLimitDaily = parseInt(formData.get("chatLimitDaily") as string);
  const voiceMinutesDaily = parseInt(
    formData.get("voiceMinutesDaily") as string,
  );
  const toolsLimitDaily = parseInt(formData.get("toolsLimitDaily") as string);
  const docsLimitTotal = parseInt(formData.get("docsLimitTotal") as string);

  const maxSortOrder = await prisma.tierDefinition.aggregate({
    _max: { sortOrder: true },
  });

  await prisma.tierDefinition.create({
    data: {
      code: code.toLowerCase().replace(/\s+/g, "-"),
      name,
      description: description || null,
      monthlyPriceEur: monthlyPrice ? parseFloat(monthlyPrice) : null,
      chatLimitDaily: chatLimitDaily || 10,
      voiceMinutesDaily: voiceMinutesDaily || 5,
      toolsLimitDaily: toolsLimitDaily || 10,
      docsLimitTotal: docsLimitTotal || 1,
      sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
    },
  });

  await prisma.tierAuditLog.create({
    data: {
      action: "TIER_CREATE",
      adminId: "system",
      changes: { code, name },
    },
  });

  revalidatePath("/admin/tiers");
  redirect("/admin/tiers");
}

export default async function CreateTierPage() {
  const t = await getTranslations("admin");
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

      <h1 className="mb-6 text-3xl font-bold">{t("createNewTier")}</h1>

      <form action={createTier} className="max-w-2xl space-y-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-medium">{t("basicInformation")}</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("code")}
              </label>
              <input
                type="text"
                name="code"
                required
                placeholder={t("eGEnterprise1")}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("name")}
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder={t("eGEnterprise")}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">
              {t("description")}
            </label>
            <textarea
              name="description"
              rows={3}
              placeholder={t("tierDescriptionForUsers")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">
              {t("monthlyPriceEur")}
            </label>
            <input
              type="number"
              name="monthlyPriceEur"
              step="0.01"
              min="0"
              placeholder={t("leaveEmptyForFreeTier")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-medium">{t("usageLimits")}</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("chatMessagesDay")}
              </label>
              <input
                type="number"
                name="chatLimitDaily"
                defaultValue={10}
                min={0}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("voiceMinutesDay")}
              </label>
              <input
                type="number"
                name="voiceMinutesDaily"
                defaultValue={5}
                min={0}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("toolUsesDay")}
              </label>
              <input
                type="number"
                name="toolsLimitDaily"
                defaultValue={10}
                min={0}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("documentsTotal")}
              </label>
              <input
                type="number"
                name="docsLimitTotal"
                defaultValue={1}
                min={0}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              />
            </div>
          </div>
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
            {t("createTier")}
          </button>
        </div>
      </form>
    </div>
  );
}
