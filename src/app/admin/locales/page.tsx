import { validateAdminAuth } from "@/lib/auth/session-auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Languages, Plus } from "lucide-react";
import { LocalesTable } from "./locales-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AdminLocalesPage() {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/login");
  }

  const locales = await prisma.localeConfig.findMany({
    select: {
      id: true,
      countryName: true,
      primaryLocale: true,
      primaryLanguageMaestroId: true,
      secondaryLocales: true,
      enabled: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { countryName: "asc" },
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Languages className="w-8 h-8 text-primary" aria-hidden="true" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
            Gestione Lingue e Paesi
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/locales/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuova Configurazione
            </Button>
          </Link>
        </div>
      </div>
      <LocalesTable locales={locales} />
    </div>
  );
}
