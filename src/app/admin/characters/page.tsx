/**
 * Character Management Admin Page
 * F-15, F-16, F-17 - Manage maestri, coaches, and buddies
 */

import { getTranslations } from "next-intl/server";
import { validateAdminAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CharacterGrid } from "@/components/admin/characters/character-grid";

export const dynamic = "force-dynamic";

export default async function CharactersPage() {
  const auth = await validateAdminAuth();
  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/auth/login");
  }

  const t = await getTranslations("admin");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("characters.title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t("characters.description")}
        </p>
      </div>
      <CharacterGrid />
    </div>
  );
}
