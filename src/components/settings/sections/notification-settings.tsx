'use client';

import { useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNotificationStore, requestPushPermission, isPushSupported } from '@/lib/stores/notification-store';
import { cn } from '@/lib/utils';

// Notification Settings - Uses global notification store
export function NotificationSettings() {
  const { preferences, pushPermission, updatePreferences, setPushPermission: _setPushPermission } = useNotificationStore();
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
            Notifiche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Master enable toggle */}
          <label
            className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 cursor-pointer"
          >
            <div>
              <span className="font-medium text-slate-900 dark:text-white block">
                Abilita notifiche
              </span>
              <span className="text-sm text-slate-500">Attiva o disattiva tutte le notifiche</span>
            </div>
            <div
              className={cn(
                'relative w-12 h-7 rounded-full transition-colors',
                preferences.enabled ? 'bg-accent-themed' : 'bg-slate-300 dark:bg-slate-600'
              )}
              onClick={() => togglePreference('enabled')}
            >
              <span
                className={cn(
                  'absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform',
                  preferences.enabled ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </div>
          </label>

          {/* Push notifications */}
          {isPushSupported() && (
            <label
              className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 cursor-pointer"
            >
              <div>
                <span className="font-medium text-slate-900 dark:text-white block">
                  Notifiche push
                </span>
                <span className="text-sm text-slate-500">
                  {pushPermission === 'granted'
                    ? 'Ricevi notifiche anche quando l\'app è chiusa'
                    : pushPermission === 'denied'
                    ? 'Permesso negato - controlla le impostazioni del browser'
                    : 'Abilita le notifiche push del browser'}
                </span>
              </div>
              {pushPermission !== 'granted' ? (
                <Button
                  size="sm"
                  onClick={handleRequestPush}
                  disabled={isRequestingPush || pushPermission === 'denied'}
                >
                  {isRequestingPush ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Abilita'
                  )}
                </Button>
              ) : (
                <div
                  className={cn(
                    'relative w-12 h-7 rounded-full transition-colors',
                    preferences.push ? 'bg-accent-themed' : 'bg-slate-300 dark:bg-slate-600'
                  )}
                  onClick={() => togglePreference('push')}
                >
                  <span
                    className={cn(
                      'absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform',
                      preferences.push ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </div>
              )}
            </label>
          )}

          {/* Sound */}
          <label
            className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 cursor-pointer"
          >
            <div>
              <span className="font-medium text-slate-900 dark:text-white block">
                Suoni
              </span>
              <span className="text-sm text-slate-500">Riproduci suoni per le notifiche</span>
            </div>
            <div
              className={cn(
                'relative w-12 h-7 rounded-full transition-colors',
                preferences.sound ? 'bg-accent-themed' : 'bg-slate-300 dark:bg-slate-600'
              )}
              onClick={() => togglePreference('sound')}
            >
              <span
                className={cn(
                  'absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform',
                  preferences.sound ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Notification types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tipi di notifiche</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'reminders' as const, label: 'Promemoria studio', desc: 'Ricevi un promemoria per studiare' },
            { key: 'streaks' as const, label: 'Avvisi streak', desc: 'Notifica quando rischi di perdere la serie' },
            { key: 'achievements' as const, label: 'Traguardi', desc: 'Notifica quando sblocchi un achievement' },
            { key: 'levelUp' as const, label: 'Livelli', desc: 'Notifica quando sali di livello' },
            { key: 'breaks' as const, label: 'Pause', desc: 'Suggerimenti per fare pause (ADHD mode)' },
            { key: 'sessionEnd' as const, label: 'Fine sessione', desc: 'Riepilogo a fine sessione di studio' },
          ].map(item => (
            <label
              key={item.key}
              className={cn(
                'flex items-center justify-between p-4 rounded-lg cursor-pointer transition-opacity',
                preferences.enabled
                  ? 'bg-slate-50 dark:bg-slate-800/50'
                  : 'bg-slate-50/50 dark:bg-slate-800/25 opacity-50'
              )}
            >
              <div>
                <span className="font-medium text-slate-900 dark:text-white block">
                  {item.label}
                </span>
                <span className="text-sm text-slate-500">{item.desc}</span>
              </div>
              <div
                className={cn(
                  'relative w-12 h-7 rounded-full transition-colors',
                  preferences[item.key] && preferences.enabled ? 'bg-accent-themed' : 'bg-slate-300 dark:bg-slate-600'
                )}
                onClick={() => preferences.enabled && togglePreference(item.key)}
              >
                <span
                  className={cn(
                    'absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform',
                    preferences[item.key] ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </div>
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
