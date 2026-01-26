import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EnterpriseForm } from "@/components/contact/enterprise-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact.enterprise");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function EnterpriseContactPage() {
  const t = await getTranslations("contact.enterprise");

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              {t("heading")}
            </h1>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-4">
            {t("subtitle")}
          </p>
          <ul className="space-y-2 text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                •
              </span>
              <span>{t("features.customization")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                •
              </span>
              <span>{t("features.analytics")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                •
              </span>
              <span>{t("features.integration")}</span>
            </li>
          </ul>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          <EnterpriseForm />
        </div>
      </div>
    </div>
  );
}
