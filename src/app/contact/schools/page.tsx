// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SchoolsContactForm } from "./schools-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact.schools");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function SchoolsContactPage() {
  const t = await getTranslations("contact.schools");

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {t("heading")}
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
          <p className="text-slate-500 dark:text-slate-400">
            {t("description2")}
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 md:p-12">
          <SchoolsContactForm />
        </div>

        {/* Support Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center text-slate-600 dark:text-slate-300 text-sm">
          <p>
            {t("support")}{" "}
            <a
              href="mailto:schools@mirrorbuddy.ai"
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              schools@mirrorbuddy.ai
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
