// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

import { validateAdminAuth } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TierForm } from "../../components/tier-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface EditTierPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTierPage({ params }: EditTierPageProps) {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/login");
  }

  const t = await getTranslations("admin.tiers");
  const { id } = await params;

  const tier = await prisma.tierDefinition.findUnique({
    where: { id },
  });

  if (!tier) {
    notFound();
  }

  // Convert Decimal to number for serialization
  const serializedTier = {
    id: tier.id,
    code: tier.code,
    name: tier.name,
    description: tier.description,
    monthlyPriceEur:
      tier.monthlyPriceEur !== null
        ? typeof tier.monthlyPriceEur === "object" &&
          "toNumber" in tier.monthlyPriceEur
          ? tier.monthlyPriceEur.toNumber()
          : Number(tier.monthlyPriceEur)
        : null,
    sortOrder: tier.sortOrder,
    isActive: tier.isActive,
    chatLimitDaily: tier.chatLimitDaily,
    voiceMinutesDaily: tier.voiceMinutesDaily,
    toolsLimitDaily: tier.toolsLimitDaily,
    docsLimitTotal: tier.docsLimitTotal,
    videoVisionSecondsPerSession: tier.videoVisionSecondsPerSession,
    videoVisionMinutesMonthly: tier.videoVisionMinutesMonthly,
    chatModel: tier.chatModel,
    realtimeModel: tier.realtimeModel,
    pdfModel: tier.pdfModel,
    mindmapModel: tier.mindmapModel,
    quizModel: tier.quizModel,
    flashcardsModel: tier.flashcardsModel,
    summaryModel: tier.summaryModel,
    formulaModel: tier.formulaModel,
    chartModel: tier.chartModel,
    homeworkModel: tier.homeworkModel,
    webcamModel: tier.webcamModel,
    demoModel: tier.demoModel,
    features: tier.features as Record<string, unknown>,
    availableMaestri: tier.availableMaestri as string[],
    availableCoaches: tier.availableCoaches as string[],
    availableBuddies: tier.availableBuddies as string[],
    availableTools: tier.availableTools as string[],
    stripePriceId: tier.stripePriceId,
  };

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
          {t("page.editTier")}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          {t("page.editMessage", { name: tier.name })}
        </p>
      </div>

      <TierForm tier={serializedTier} />
    </div>
  );
}
