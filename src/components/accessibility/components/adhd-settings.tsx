/**
 * @file adhd-settings.tsx
 * @brief ADHD settings component
 */

import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import { Toggle } from './toggle';

export function ADHDSettings() {
  const {
    settings,
    updateSettings,
    adhdConfig,
    updateADHDConfig,
    adhdStats,
  } = useAccessibilityStore();

  return (
    <div className="space-y-4">
      <Toggle
        label="Modalità ADHD"
        description="Attiva funzionalità per la concentrazione"
        checked={settings.adhdMode}
        onChange={(v) => updateSettings({ adhdMode: v })}
        icon={<Brain className="w-5 h-5" />}
      />

      <Toggle
        label="Modalità senza distrazioni"
        description="Nascondi elementi UI non essenziali"
        checked={settings.distractionFreeMode}
        onChange={(v) => updateSettings({ distractionFreeMode: v })}
      />

      <Toggle
        label="Promemoria pause"
        description="Ricevi notifiche per le pause"
        checked={settings.breakReminders}
        onChange={(v) => updateSettings({ breakReminders: v })}
      />

      <div
        className={cn(
          'p-4 rounded-lg',
          settings.highContrast
            ? 'bg-gray-900 border border-gray-700'
            : 'bg-slate-50 dark:bg-slate-800/50'
        )}
      >
        <h4
          className={cn(
            'font-medium mb-3',
            settings.highContrast
              ? 'text-yellow-400'
              : 'text-slate-900 dark:text-white'
          )}
        >
          Timer Sessione
        </h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-500 dark:text-slate-400">
              Lavoro (min)
            </label>
            <input
              type="number"
              value={Math.floor(adhdConfig.workDuration / 60)}
              onChange={(e) =>
                updateADHDConfig({
                  workDuration: parseInt(e.target.value) * 60,
                })
              }
              min={5}
              max={60}
              className={cn(
                'w-full mt-1 px-3 py-2 rounded-lg border',
                settings.highContrast
                  ? 'bg-black border-yellow-400 text-white'
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
              )}
            />
          </div>

          <div>
            <label className="text-sm text-slate-500 dark:text-slate-400">
              Pausa (min)
            </label>
            <input
              type="number"
              value={Math.floor(adhdConfig.breakDuration / 60)}
              onChange={(e) =>
                updateADHDConfig({
                  breakDuration: parseInt(e.target.value) * 60,
                })
              }
              min={3}
              max={30}
              className={cn(
                'w-full mt-1 px-3 py-2 rounded-lg border',
                settings.highContrast
                  ? 'bg-black border-yellow-400 text-white'
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
              )}
            />
          </div>
        </div>
      </div>

      <div
        className={cn(
          'p-4 rounded-lg',
          settings.highContrast
            ? 'bg-gray-900 border border-gray-700'
            : 'bg-slate-50 dark:bg-slate-800/50'
        )}
      >
        <h4
          className={cn(
            'font-medium mb-3',
            settings.highContrast
              ? 'text-yellow-400'
              : 'text-slate-900 dark:text-white'
          )}
        >
          Le tue statistiche
        </h4>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500 dark:text-slate-400">
              Sessioni totali:
            </span>
            <span className="ml-2 font-medium">
              {adhdStats.totalSessions}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">
              Completate:
            </span>
            <span className="ml-2 font-medium">
              {adhdStats.completedSessions}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">
              Serie attuale:
            </span>
            <span className="ml-2 font-medium">
              {adhdStats.currentStreak} giorni
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">
              XP totali:
            </span>
            <span className="ml-2 font-medium">{adhdStats.totalXPEarned}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

