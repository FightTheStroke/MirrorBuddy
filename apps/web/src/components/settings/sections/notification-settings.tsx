"use client";

import { useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useNotificationStore,
  requestPushPermission,
  isPushSupported,
} from "@/lib/stores/notification-store";
import { cn } from "@/lib/utils";

// Notification Settings - Uses global notification store
export function NotificationSettings() {
  const t = useTranslations("settings");
  const {
    preferences,
    pushPermission,
    updatePreferences,
    setPushPermission: _setPushPermission,
  } = useNotificationStore();
  const [isRequestingPush, setIsRequestingPush] = useState(false);

  const handleRequestPush = async () => {
    setIsRequestingPush(true);
    try {
      const granted = await requestPushPermission();
      if (granted) {
        updatePreferences({ push: true });
      }
    } finally {
      setIsRequestingPush(false);
    }
  };

  const togglePreference = (key: keyof typeof preferences) => {
    updatePreferences({ [key]: !preferences[key] });
  };

  return (
    <div className="space-y-6">
      {/* Master toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            {t("notifications.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Master enable toggle */}
          <label
            htmlFor="notification-enable"
            className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 cursor-pointer"
          >
            <span className="sr-only">{t("notifications.enable")}</span>
            <div>
              <span
                className="font-medium text-slate-900 dark:text-white block"
                aria-hidden="true"
              >
                {t("notifications.enable")}
              </span>
              <span className="text-sm text-slate-500" aria-hidden="true">
                {t("notifications.description")}
              </span>
            </div>
            <button
              id="notification-enable"
              type="button"
              role="switch"
              aria-checked={preferences.enabled}
              className={cn(
                "relative w-12 h-7 rounded-full transition-colors",
                preferences.enabled
                  ? "bg-accent-themed"
                  : "bg-slate-300 dark:bg-slate-600",
              )}
              onClick={() => togglePreference("enabled")}
            >
              <span
                className={cn(
                  "absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform",
                  preferences.enabled ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </label>

          {/* Push notifications */}
          {isPushSupported() && (
            <label
              htmlFor="notification-push"
              className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 cursor-pointer"
            >
              <div>
                <span className="font-medium text-slate-900 dark:text-white block">
                  {t("notifications.push")}
                </span>
                <span className="text-sm text-slate-500">
                  {pushPermission === "granted"
                    ? t("notifications.pushGranted")
                    : pushPermission === "denied"
                      ? t("notifications.pushDenied")
                      : t("notifications.pushDefault")}
                </span>
              </div>
              {pushPermission !== "granted" ? (
                <Button
                  id="notification-push"
                  size="sm"
                  onClick={handleRequestPush}
                  disabled={isRequestingPush || pushPermission === "denied"}
                >
                  {isRequestingPush ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t("notifications.pushButton")
                  )}
                </Button>
              ) : (
                <button
                  id="notification-push"
                  type="button"
                  role="switch"
                  aria-checked={preferences.push}
                  className={cn(
                    "relative w-12 h-7 rounded-full transition-colors",
                    preferences.push
                      ? "bg-accent-themed"
                      : "bg-slate-300 dark:bg-slate-600",
                  )}
                  onClick={() => togglePreference("push")}
                >
                  <span
                    className={cn(
                      "absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform",
                      preferences.push ? "translate-x-5" : "translate-x-0",
                    )}
                  />
                </button>
              )}
            </label>
          )}

          {/* Sound */}
          <label
            htmlFor="notification-sound"
            className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 cursor-pointer"
          >
            <span className="sr-only">{t("notifications.sound")}</span>
            <div>
              <span
                className="font-medium text-slate-900 dark:text-white block"
                aria-hidden="true"
              >
                {t("notifications.sound")}
              </span>
              <span className="text-sm text-slate-500" aria-hidden="true">
                {t("notifications.soundDescription")}
              </span>
            </div>
            <button
              id="notification-sound"
              type="button"
              role="switch"
              aria-checked={preferences.sound}
              className={cn(
                "relative w-12 h-7 rounded-full transition-colors",
                preferences.sound
                  ? "bg-accent-themed"
                  : "bg-slate-300 dark:bg-slate-600",
              )}
              onClick={() => togglePreference("sound")}
            >
              <span
                className={cn(
                  "absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform",
                  preferences.sound ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </label>
        </CardContent>
      </Card>

      {/* Notification types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("notifications.typeTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              key: "reminders" as const,
              label: t("notifications.reminders"),
              desc: t("notifications.remindersDesc"),
            },
            {
              key: "streaks" as const,
              label: t("notifications.streaks"),
              desc: t("notifications.streaksDesc"),
            },
            {
              key: "achievements" as const,
              label: t("notifications.achievements"),
              desc: t("notifications.achievementsDesc"),
            },
            {
              key: "levelUp" as const,
              label: t("notifications.levelUp"),
              desc: t("notifications.levelUpDesc"),
            },
            {
              key: "breaks" as const,
              label: t("notifications.breaks"),
              desc: t("notifications.breaksDesc"),
            },
            {
              key: "sessionEnd" as const,
              label: t("notifications.sessionEnd"),
              desc: t("notifications.sessionEndDesc"),
            },
          ].map((item) => (
            <label
              key={item.key}
              htmlFor={`notification-${item.key}`}
              className={cn(
                "flex items-center justify-between p-4 rounded-lg cursor-pointer transition-opacity",
                preferences.enabled
                  ? "bg-slate-50 dark:bg-slate-800/50"
                  : "bg-slate-50/50 dark:bg-slate-800/25 opacity-50",
              )}
            >
              <span className="sr-only">{item.label}</span>
              <div>
                <span
                  className="font-medium text-slate-900 dark:text-white block"
                  aria-hidden="true"
                >
                  {item.label}
                </span>
                <span className="text-sm text-slate-500" aria-hidden="true">
                  {item.desc}
                </span>
              </div>
              <button
                id={`notification-${item.key}`}
                type="button"
                role="switch"
                aria-checked={preferences[item.key]}
                disabled={!preferences.enabled}
                className={cn(
                  "relative w-12 h-7 rounded-full transition-colors",
                  preferences[item.key] && preferences.enabled
                    ? "bg-accent-themed"
                    : "bg-slate-300 dark:bg-slate-600",
                )}
                onClick={() =>
                  preferences.enabled && togglePreference(item.key)
                }
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform",
                    preferences[item.key] ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </button>
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
