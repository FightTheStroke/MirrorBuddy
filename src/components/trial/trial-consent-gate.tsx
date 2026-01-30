"use client";

import { useState, useEffect } from "react";
import { Shield, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { hasTrialConsent, setTrialConsent } from "@/lib/consent/trial-consent";

interface TrialConsentGateProps {
  children: React.ReactNode;
}

/**
 * Trial Consent Gate - GDPR Compliant
 *
 * Blocks trial activation until user explicitly consents to privacy policy.
 * Required for F-02: GDPR consent gate.
 *
 * Features:
 * - Shows privacy policy link
 * - Requires explicit checkbox + button click
 * - Stores consent in unified system
 * - WCAG 2.1 AA accessible
 */
export function TrialConsentGate({ children }: TrialConsentGateProps) {
  const t = useTranslations("auth.trialConsent");
  const [consented, setConsented] = useState<boolean>(false);
  const [checkboxChecked, setCheckboxChecked] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check consent on mount
  useEffect(() => {
    const checkConsent = () => {
      // Check if trial consent cookie exists
      const cookies = document.cookie.split("; ");
      const trialConsentCookie = cookies.find((c) =>
        c.startsWith("mirrorbuddy-trial-consent="),
      );

      if (trialConsentCookie) {
        setConsented(true);
        setIsLoading(false);
        return;
      }

      // Fallback to unified consent system
      const hasConsent = hasTrialConsent();
      setConsented(hasConsent);
      setIsLoading(false);
    };

    checkConsent();
  }, []);

  const handleAccept = () => {
    setTrialConsent();
    // Also set a cookie that the server can read for API validation
    const consentData = {
      accepted: true,
      version: "1.0",
      acceptedAt: new Date().toISOString(),
    };
    document.cookie = `mirrorbuddy-trial-consent=${encodeURIComponent(
      JSON.stringify(consentData),
    )}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    setConsented(true);
  };

  // Show loading state to avoid flash of consent UI
  if (isLoading) {
    return null;
  }

  // User has consented, show children
  if (consented) {
    return <>{children}</>;
  }

  // Show consent gate
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div
        className="max-w-lg w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 space-y-6"
        role="dialog"
        aria-labelledby="trial-consent-title"
        aria-describedby="trial-consent-description"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1
              id="trial-consent-title"
              className="text-xl font-bold text-slate-900 dark:text-white"
            >
              {t("title")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("subtitle")}
            </p>
          </div>
        </div>

        {/* Explanation */}
        <div
          id="trial-consent-description"
          className="space-y-4 text-sm text-slate-600 dark:text-slate-300"
        >
          <p>{t("description")}</p>
          <p>{t("processingIntro")}</p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>{t("dataConversations")}</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>{t("dataProgress")}</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>{t("dataCookies")}</span>
            </li>
          </ul>
        </div>

        {/* Privacy policy link */}
        <div className="flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            {t("privacyLink")}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Consent checkbox */}
        <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
          <Checkbox
            id="trial-consent-checkbox"
            checked={checkboxChecked}
            onCheckedChange={(checked) => setCheckboxChecked(checked === true)}
            aria-label={t("checkboxLabel")}
          />
          <label
            htmlFor="trial-consent-checkbox"
            className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none"
          >
            {t("checkboxLabel")}
          </label>
        </div>

        {/* Accept button */}
        <Button
          onClick={handleAccept}
          disabled={!checkboxChecked}
          className="w-full"
          size="lg"
          aria-label={t("startButton")}
        >
          {t("startButton")}
        </Button>

        {/* GDPR compliance note */}
        <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
          {t("gdprNote")}
        </p>
      </div>
    </div>
  );
}

export default TrialConsentGate;
