import { validateAdminAuth } from "@/lib/auth/session-auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Layers, BarChart3 } from "lucide-react";
import { TiersTable } from "./tiers-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface TierFromDB {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthlyPriceEur: { toNumber?: () => number } | number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Tier {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthlyPriceEur: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default async function AdminTiersPage() {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/login");
  }

  const tiersFromDB: TierFromDB[] = await prisma.tierDefinition.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      monthlyPriceEur: true,
      sortOrder: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  // Convert Decimal to number for JSON serialization
  const serializedTiers: Tier[] = tiersFromDB.map((tier) => {
    let monthlyPrice: number | null = null;
    if (tier.monthlyPriceEur !== null) {
      if (
        typeof tier.monthlyPriceEur === "object" &&
        "toNumber" in tier.monthlyPriceEur &&
        typeof tier.monthlyPriceEur.toNumber === "function"
      ) {
        monthlyPrice = tier.monthlyPriceEur.toNumber();
      } else if (typeof tier.monthlyPriceEur === "number") {
        monthlyPrice = tier.monthlyPriceEur;
      }
    }

    return {
      ...tier,
      monthlyPriceEur: monthlyPrice,
    };
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Layers className="w-8 h-8 text-primary" aria-hidden="true" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
            Gestione Piani
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/tiers/analytics">
            <Button variant="outline">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
          </Link>
          <Link href="/admin/tiers/new">
            <Button>Nuovo Piano</Button>
          </Link>
        </div>
      </div>
      <TiersTable tiers={serializedTiers} />
    </div>
  );
}
