import { validateAdminAuth } from "@/lib/auth/session-auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
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
    chatModel: tier.chatModel,
    realtimeModel: tier.realtimeModel,
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
            Torna ai Piani
          </Button>
        </Link>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
          Modifica Piano
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          Modifica il piano: {tier.name}
        </p>
      </div>

      <TierForm tier={serializedTier} />
    </div>
  );
}
