"use client";

import { useTranslations } from "next-intl";
import { Cookie, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  saveConsent,
  syncConsentToServer,
} from "@/lib/consent/consent-storage";
import { updateConsentSnapshot } from "@/lib/consent/consent-store";

interface CookiePreferencesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analyticsEnabled: boolean;
  onAnalyticsEnabledChange: (enabled: boolean) => void;
}

/**
 * Cookie Preferences Modal - Detailed cookie consent management
 *
 * Allows users to customize their cookie preferences with granular control.
 * GDPR compliant - essential cookies cannot be disabled.
 */
export function CookiePreferencesModal({
  open,
  onOpenChange,
  analyticsEnabled,
  onAnalyticsEnabledChange,
}: CookiePreferencesModalProps) {
  const t = useTranslations("consent.cookie");

  const handleSave = async () => {
    const consent = saveConsent(analyticsEnabled);
    await syncConsentToServer(consent);
    updateConsentSnapshot(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cookie className="w-5 h-5" />
            {t("customize.title")}
          </DialogTitle>
          <DialogDescription>{t("customize.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Essential cookies - always on */}
          <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
            <Shield className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-slate-900 dark:text-white text-sm">
                {t("list.session")}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t("customize.essentialDesc")}
              </p>
            </div>
            <div className="w-11 h-6 bg-green-600 rounded-full flex items-center justify-end px-1">
              <span className="w-5 h-5 bg-white rounded-full shadow" />
            </div>
          </div>

          {/* Analytics toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
            <div className="flex-1">
              <p className="font-medium text-slate-900 dark:text-white text-sm">
                {t("analytics.label")}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t("analytics.description")}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={analyticsEnabled}
              aria-label={t("analytics.aria")}
              onClick={() => onAnalyticsEnabledChange(!analyticsEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                analyticsEnabled
                  ? "bg-blue-600"
                  : "bg-slate-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  analyticsEnabled ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            {t("customize.cancel")}
          </Button>
          <Button onClick={handleSave} className="flex-1">
            {t("customize.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
