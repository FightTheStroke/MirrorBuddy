"use client";

import { useState, useCallback, useEffect } from "react";
import { Bell, Volume2, Moon, Clock, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationToggle } from "./components/notification-toggle";
import { PushSection } from "./notification-preferences/push-section";
import type { NotificationPreferences as NotificationPrefsType } from "@/lib/scheduler/types";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/scheduler/types";
import {
  getPushCapabilityStatus,
  type PushCapabilityStatus,
} from "@/lib/push/vapid";
import {
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
} from "@/lib/push/subscription";

interface NotificationPreferencesProps {
  preferences: NotificationPrefsType;
  onUpdate: (prefs: Partial<NotificationPrefsType>) => Promise<void>;
  isLoading?: boolean;
}

const TIME_OPTIONS = [
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
];

export function NotificationPreferences({
  preferences,
  onUpdate,
  isLoading,
}: NotificationPreferencesProps) {
  const [saving, setSaving] = useState(false);
  const prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...preferences };

  // Push notification state
  const [pushCapability, setPushCapability] =
    useState<PushCapabilityStatus | null>(null);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Check push capability on mount
  useEffect(() => {
    setPushCapability(getPushCapabilityStatus());
    isPushSubscribed().then(setPushSubscribed);
  }, []);

  // Handle push toggle
  const handlePushToggle = useCallback(async () => {
    if (pushCapability !== "supported") return;

    setPushLoading(true);
    try {
      if (pushSubscribed) {
        const success = await unsubscribeFromPush();
        if (success) setPushSubscribed(false);
      } else {
        const subscription = await subscribeToPush();
        if (subscription) setPushSubscribed(true);
      }
    } finally {
      setPushLoading(false);
    }
  }, [pushCapability, pushSubscribed]);

  const handleToggle = useCallback(
    async (key: keyof NotificationPrefsType, value: boolean) => {
      setSaving(true);
      try {
        await onUpdate({ [key]: value });
      } finally {
        setSaving(false);
      }
    },
    [onUpdate],
  );

  const handleTimeChange = useCallback(
    async (
      key: "quietHoursStart" | "quietHoursEnd" | "streakWarningTime",
      value: string,
    ) => {
      setSaving(true);
      try {
        await onUpdate({ [key]: value });
      } finally {
        setSaving(false);
      }
    },
    [onUpdate],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-500" />
          Preferenze Notifiche
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main toggles */}
        <div className="space-y-3">
          <NotificationToggle
            icon={<Bell className="w-5 h-5 text-slate-500" />}
            label="Notifiche"
            description="Abilita tutte le notifiche"
            isEnabled={prefs.enabled}
            isDisabled={saving || isLoading}
            onChange={(value) => handleToggle("enabled", value)}
          />

          <NotificationToggle
            icon={<MessageCircle className="w-5 h-5 text-slate-500" />}
            label="In-app"
            description="Mostra notifiche nell'app"
            isEnabled={prefs.inAppEnabled && prefs.enabled}
            isDisabled={saving || isLoading || !prefs.enabled}
            onChange={(value) => handleToggle("inAppEnabled", value)}
          />

          <NotificationToggle
            icon={<Volume2 className="w-5 h-5 text-slate-500" />}
            label="Voce di Melissa"
            description="Melissa legge le notifiche"
            isEnabled={prefs.voiceEnabled && prefs.enabled}
            isDisabled={saving || isLoading || !prefs.enabled}
            onChange={(value) => handleToggle("voiceEnabled", value)}
          />

          {/* Push Notifications */}
          <PushSection
            pushCapability={pushCapability}
            pushSubscribed={pushSubscribed}
            pushLoading={pushLoading}
            enabled={prefs.enabled}
            onToggle={handlePushToggle}
          />
        </div>

        {/* Quiet hours */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3 mb-3">
            <Moon className="w-5 h-5 text-slate-500" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                Ore di silenzio
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Niente notifiche in questi orari
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="quiet-hours-start"
                className="text-xs text-slate-500 dark:text-slate-400"
              >
                Dalle
              </label>
              <select
                id="quiet-hours-start"
                value={prefs.quietHoursStart || "22:00"}
                onChange={(e) =>
                  handleTimeChange("quietHoursStart", e.target.value)
                }
                disabled={saving || isLoading || !prefs.enabled}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="quiet-hours-end"
                className="text-xs text-slate-500 dark:text-slate-400"
              >
                Alle
              </label>
              <select
                id="quiet-hours-end"
                value={prefs.quietHoursEnd || "07:00"}
                onChange={(e) =>
                  handleTimeChange("quietHoursEnd", e.target.value)
                }
                disabled={saving || isLoading || !prefs.enabled}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              >
                <option value="06:00">06:00</option>
                <option value="06:30">06:30</option>
                <option value="07:00">07:00</option>
                <option value="07:30">07:30</option>
                <option value="08:00">08:00</option>
                <option value="08:30">08:30</option>
                <option value="09:00">09:00</option>
              </select>
            </div>
          </div>
        </div>

        {/* Streak warning time */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-5 h-5 text-slate-500" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                Avviso streak
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ricevi un avviso se non hai studiato
              </p>
            </div>
          </div>
          <label htmlFor="streak-warning-time" className="sr-only">
            Orario avviso streak
          </label>
          <select
            id="streak-warning-time"
            value={prefs.streakWarningTime || "21:00"}
            onChange={(e) =>
              handleTimeChange("streakWarningTime", e.target.value)
            }
            disabled={saving || isLoading || !prefs.enabled}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </CardContent>
    </Card>
  );
}
