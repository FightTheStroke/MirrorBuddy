"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ContactForm } from "./components/contact-form";

export function ContactClient() {
  const t = useTranslations("compliance.contact");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav
        className="bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700"
        aria-label={t("navigazionePagina")}
      >
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            aria-label={t("tornaAllaHomePageDiMirrorbuddy")}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            {t("backButton")}
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-12">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              {t("page.title")}
            </h1>
            <p className="text-lg text-slate-600 dark:text-gray-300">
              {t("page.subtitle")}
            </p>
          </div>

          {/* Contact Form */}
          <ContactForm />
        </article>
      </main>
    </div>
  );
}
