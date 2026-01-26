import { validateAdminAuth } from "@/lib/auth/session-auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TierForm } from "../components/tier-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function NewTierPage() {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/login");
  }

  const t = await getTranslations("admin.tiers");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/tiers">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("page.backToTiers")}
          </Button>
        </Link>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
          {t("page.newTier")}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          {t("page.createNew")}
        </p>
      </div>

      <TierForm />
    </div>
  );
}
