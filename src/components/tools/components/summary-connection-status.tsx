'use client';

import { Wifi, WifiOff } from 'lucide-react';

interface SummaryConnectionStatusProps {
  sessionId: string | null;
  listenForEvents: boolean;
  isConnected: boolean;
}

export function SummaryConnectionStatus({
  sessionId,
  listenForEvents,
  isConnected,
}: SummaryConnectionStatusProps) {
  if (!sessionId || !listenForEvents) return null;

  return (
    <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
      {isConnected ? (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          <span className="text-xs text-green-600 dark:text-green-400">
            Connesso - modifica vocale attiva
          </span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-amber-500" />
          <span className="text-xs text-amber-600 dark:text-amber-400">
            Connessione in corso...
          </span>
        </>
      )}
    </div>
  );
}
