/**
 * Parent Dashboard Page
 *
 * Server component that fetches student insights and handles consent flow.
 * Related: ADR 0008 (Parent Dashboard GDPR Consent Model), F-05, F-13
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { validateAuth } from "@/lib/auth";
import { ParentDashboard } from "@/components/profile/parent-dashboard";
import { ParentDashboardClient } from "./parent-dashboard-client";
import type { StudentInsights } from "@/types";

// Force dynamic rendering (this page requires authentication and real-time data)
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard Genitori | MirrorBuddy",
  description: "Visualizza i progressi e gli insights del tuo studente",
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ParentDashboardPage({ params }: PageProps) {
  const { locale } = await params;

  // Check authentication
  const auth = await validateAuth();
  if (!auth.authenticated || !auth.userId) {
    redirect(`/${locale}/login`);
  }

  const userId = auth.userId;

  // Fetch consent status
  const consentResponse = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/profile/consent?userId=${userId}`,
    {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!consentResponse.ok) {
    return <ErrorState locale={locale} />;
  }

  const consentData = await consentResponse.json();

  // If no profile exists, show generate profile UI
  if (!consentData.data.hasProfile) {
    return <NoProfileState userId={userId} locale={locale} />;
  }

  // If consent not given, show consent form
  if (!consentData.data.parentConsent) {
    return <ConsentRequiredState userId={userId} locale={locale} />;
  }

  // Fetch profile data
  const profileResponse = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/profile`,
    {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Cookie: `mirrorbuddy-user-id=${userId}`,
      },
    },
  );

  if (!profileResponse.ok) {
    return <ErrorState locale={locale} />;
  }

  const profileData = await profileResponse.json();
  const insights: StudentInsights = profileData.data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-7xl mx-auto">
        <ParentDashboard insights={insights} />
      </div>
    </div>
  );
}

/**
 * Error state component
 */
async function ErrorState({ locale }: { locale: string }) {
  const t = await getTranslations("education.parentDashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 p-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
        <div className="mb-4 text-red-500">
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {t("error.title")}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          {t("error.message")}
        </p>
        <a
          href={`/${locale}`}
          className="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          {t("error.backHome")}
        </a>
      </div>
    </div>
  );
}

/**
 * No profile state - show generate profile button
 */
function NoProfileState({
  userId,
  locale,
}: {
  userId: string;
  locale: string;
}) {
  return (
    <ParentDashboardClient state="no-profile" userId={userId} locale={locale} />
  );
}

/**
 * Consent required state - show consent form
 */
function ConsentRequiredState({
  userId,
  locale,
}: {
  userId: string;
  locale: string;
}) {
  return (
    <ParentDashboardClient
      state="needs-consent"
      userId={userId}
      locale={locale}
    />
  );
}
