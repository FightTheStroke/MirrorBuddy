/**
 * Edit Tier - Admin CRUD
 * Task: T1-11 (F-26)
 */
 

import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Edit Tier | Admin",
};

interface Props {
  params: Promise<{ id: string }>;
}

async function getTier(id: string) {
  const tier = await prisma.tierDefinition.findUnique({
    where: { id },
  });
  if (!tier) notFound();
  return tier;
}

async function updateTier(formData: FormData) {
  "use server";

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const chatLimitDaily = parseInt(formData.get("chatLimitDaily") as string);
  const voiceMinutesDaily = parseInt(
    formData.get("voiceMinutesDaily") as string,
  );
  const toolsLimitDaily = parseInt(formData.get("toolsLimitDaily") as string);
  const docsLimitTotal = parseInt(formData.get("docsLimitTotal") as string);
  const sortOrder = parseInt(formData.get("sortOrder") as string);
  const isActive = formData.get("isActive") === "on";

  const oldTier = await prisma.tierDefinition.findUnique({ where: { id } });

  await prisma.tierDefinition.update({
    where: { id },
    data: {
      name,
      description: description || null,
      chatLimitDaily,
      voiceMinutesDaily,
      toolsLimitDaily,
      docsLimitTotal,
      sortOrder,
      isActive,
    },
  });

  await prisma.tierAuditLog.create({
    data: {
      tierId: id,
      action: "TIER_UPDATE",
      adminId: "system",
      changes: {
        before: { name: oldTier?.name, isActive: oldTier?.isActive },
        after: { name, isActive },
      },
    },
  });

  revalidatePath("/admin/tiers");
  redirect("/admin/tiers");
}

async function deleteTier(formData: FormData) {
  "use server";

  const id = formData.get("id") as string;

  // Soft delete - just mark as inactive
  await prisma.tierDefinition.update({
    where: { id },
    data: { isActive: false },
  });

  await prisma.tierAuditLog.create({
    data: {
      tierId: id,
      action: "TIER_DELETE",
      adminId: "system",
      changes: { softDeleted: true },
    },
  });

  revalidatePath("/admin/tiers");
  redirect("/admin/tiers");
}

export default async function EditTierPage({ params }: Props) {
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

      <h1 className="mb-6 text-3xl font-bold">{t("editTier")} {tier.name}</h1>

      <form action={updateTier} className="max-w-2xl space-y-6">
        <input type="hidden" name="id" value={tier.id} />

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-medium">{t("basicInformation")}</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("code")}
              </label>
              <input
                type="text"
                value={tier.code}
                disabled
                className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2"
              />
              <p className="mt-1 text-xs text-gray-500">
                {t("codeCannotBeChanged")}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("name")}
              </label>
              <input
                type="text"
                name="name"
                required
                defaultValue={tier.name}
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
              defaultValue={tier.description || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("sortOrder")}
              </label>
              <input
                type="number"
                name="sortOrder"
                defaultValue={tier.sortOrder}
                min={0}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                name="isActive"
                id="isActive"
                defaultChecked={tier.isActive}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                {t("activeVisibleToUsers")}
              </label>
            </div>
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
                defaultValue={tier.chatLimitDaily}
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
                defaultValue={tier.voiceMinutesDaily}
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
                defaultValue={tier.toolsLimitDaily}
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
                defaultValue={tier.docsLimitTotal}
                min={0}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <form action={deleteTier}>
            <input type="hidden" name="id" value={tier.id} />
            <button
              type="submit"
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              onClick={(e) => {
                if (!confirm("Deactivate this tier?")) e.preventDefault();
              }}
            >
              {t("deactivateTier")}
            </button>
          </form>

          <div className="flex gap-4">
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
              {t("saveChanges")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
