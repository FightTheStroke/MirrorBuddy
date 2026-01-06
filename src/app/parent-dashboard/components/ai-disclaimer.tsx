/**
 * @file ai-disclaimer.tsx
 * @brief AI disclaimer component
 */

import { AlertCircle } from 'lucide-react';

export function AIDisclaimer() {
  return (
    <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 mt-0.5">
          <AlertCircle className="h-4 w-4 text-slate-500" />
        </div>
        <div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <strong className="text-slate-700 dark:text-slate-300">
              Disclaimer AI:
            </strong>{' '}
            Tutte le osservazioni, i profili e i suggerimenti presenti in
            questa pagina sono generati automaticamente da un sistema di
            Intelligenza Artificiale. L&apos;AI puo commettere errori e le
            informazioni fornite non sostituiscono la valutazione di insegnanti,
            psicologi o altri professionisti qualificati. Usa queste informazioni
            come spunto di riflessione e dialogo, non come diagnosi o valutazione
            definitiva delle capacita di tuo/a figlio/a.
          </p>
        </div>
      </div>
    </div>
  );
}

