'use client';

import { useState, useCallback, useEffect } from 'react';
import { Bell, Volume2, Moon, Clock, MessageCircle, Smartphone, AlertCircle, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { NotificationPreferences as NotificationPrefsType } from '@/lib/scheduler/types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/lib/scheduler/types';
import {
  getPushCapabilityStatus,
  getPushCapabilityMessage,
  type PushCapabilityStatus,
} from '@/lib/push/vapid';
import {
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
} from '@/lib/push/subscription';

interface NotificationPreferencesProps {
  preferences: NotificationPrefsType;
  onUpdate: (prefs: Partial<NotificationPrefsType>) => Promise<void>;
  isLoading?: boolean;
}

const TIME_OPTIONS = [
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00', '22:30', '23:00',
];

export function NotificationPreferences({
  preferences,
  onUpdate,
  isLoading,
}: NotificationPreferencesProps) {
  const [saving, setSaving] = useState(false);
  const prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...preferences };

  // Push notification state
  const [pushCapability, setPushCapability] = useState<PushCapabilityStatus | null>(null);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Check push capability on mount
  useEffect(() => {
    setPushCapability(getPushCapabilityStatus());
    isPushSubscribed().then(setPushSubscribed);
  }, []);

  // Handle push toggle
  const handlePushToggle = useCallback(async () => {
    if (pushCapability !== 'supported') return;

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
    [onUpdate]
  );

  const handleTimeChange = useCallback(
    async (key: 'quietHoursStart' | 'quietHoursEnd' | 'streakWarningTime', value: string) => {
      setSaving(true);
      try {
        await onUpdate({ [key]: value });
      } finally {
        setSaving(false);
      }
    },
    [onUpdate]
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
          {/* Enable/Disable all */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-slate-500" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Notifiche</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Abilita tutte le notifiche
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('enabled', !prefs.enabled)}
              disabled={saving || isLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.enabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* In-app */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-slate-500" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">In-app</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Mostra notifiche nell&apos;app
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('inAppEnabled', !prefs.inAppEnabled)}
              disabled={saving || isLoading || !prefs.enabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.inAppEnabled && prefs.enabled
                  ? 'bg-blue-500'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.inAppEnabled && prefs.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Voice (Melissa) */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-slate-500" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Voce di Melissa</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Melissa legge le notifiche
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('voiceEnabled', !prefs.voiceEnabled)}
              disabled={saving || isLoading || !prefs.enabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.voiceEnabled && prefs.enabled
                  ? 'bg-blue-500'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.voiceEnabled && prefs.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Push Notifications - Only shown if browser supports Push API */}
          {pushCapability && pushCapability !== 'unsupported' && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Notifiche Push</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Ricevi notifiche anche con l&apos;app chiusa
                    </p>
                  </div>
                </div>
                {/* Toggle shown only when supported */}
                {pushCapability === 'supported' && (
                  <button
                    onClick={handlePushToggle}
                    disabled={pushLoading || !prefs.enabled}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      pushSubscribed && prefs.enabled
                        ? 'bg-blue-500'
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        pushSubscribed && prefs.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                )}
              </div>

              {/* Status messages for non-supported scenarios */}
              {pushCapability === 'ios_needs_install' && (
                <div className="mt-3 p-2 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <Download className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        {getPushCapabilityMessage('ios_needs_install')}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Tocca l&apos;icona condividi <span className="font-mono">⬆</span> poi &quot;Aggiungi alla schermata Home&quot;.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {pushCapability === 'permission_denied' && (
                <div className="mt-3 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-800 dark:text-red-200">
                      {getPushCapabilityMessage('permission_denied')}
                    </p>
                  </div>
                </div>
              )}

              {/* Success message when subscribed */}
              {pushCapability === 'supported' && pushSubscribed && (
                <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                  ✓ Notifiche push attive su questo dispositivo
                </p>
              )}
            </div>
          )}
        </div>

        {/* Quiet hours */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3 mb-3">
            <Moon className="w-5 h-5 text-slate-500" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Ore di silenzio</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Niente notifiche in questi orari
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Dalle</label>
              <select
                value={prefs.quietHoursStart || '22:00'}
                onChange={(e) => handleTimeChange('quietHoursStart', e.target.value)}
                disabled={saving || isLoading || !prefs.enabled}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Alle</label>
              <select
                value={prefs.quietHoursEnd || '07:00'}
                onChange={(e) => handleTimeChange('quietHoursEnd', e.target.value)}
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
              <p className="font-medium text-slate-900 dark:text-white">Avviso streak</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ricevi un avviso se non hai studiato
              </p>
            </div>
          </div>
          <select
            value={prefs.streakWarningTime || '21:00'}
            onChange={(e) => handleTimeChange('streakWarningTime', e.target.value)}
            disabled={saving || isLoading || !prefs.enabled}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </CardContent>
    </Card>
  );
}
