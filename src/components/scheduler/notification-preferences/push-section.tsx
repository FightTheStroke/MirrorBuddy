'use client';

import { Smartphone, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getPushCapabilityMessage,
  type PushCapabilityStatus,
} from '@/lib/push/vapid';

interface PushSectionProps {
  pushCapability: PushCapabilityStatus | null;
  pushSubscribed: boolean;
  pushLoading: boolean;
  enabled: boolean;
  onToggle: () => void;
}

export function PushSection({
  pushCapability,
  pushSubscribed,
  pushLoading,
  enabled,
  onToggle,
}: PushSectionProps) {
  if (!pushCapability || pushCapability === 'unsupported') {
    return null;
  }

  return (
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
        {pushCapability === 'supported' && (
          <button
            onClick={onToggle}
            disabled={pushLoading || !enabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              pushSubscribed && enabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                pushSubscribed && enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        )}
      </div>

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

      {pushCapability === 'supported' && pushSubscribed && (
        <p className="mt-2 text-xs text-green-600 dark:text-green-400">
          ✓ Notifiche push attive su questo dispositivo
        </p>
      )}
    </div>
  );
}
