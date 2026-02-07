import { validateAdminAuth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { LocaleForm } from "@/components/admin/locale-form";

// Mark as dynamic since validateAdminAuth reads cookies
export const dynamic = "force-dynamic";

interface EditLocalePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLocalePage({ params }: EditLocalePageProps) {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/login");
  }

  const { id } = await params;

  const locale = await prisma.localeConfig.findUnique({
    where: { id },
  });

  if (!locale) {
    redirect("/admin/locales");
  }

  return (
    <LocaleForm
      mode="edit"
      initialData={{
        id: locale.id,
        countryName: locale.countryName,
        primaryLocale: locale.primaryLocale,
        primaryLanguageMaestroId: locale.primaryLanguageMaestroId,
        secondaryLocales: locale.secondaryLocales,
        enabled: locale.enabled,
      }}
    />
  );
}
