import { Target } from 'lucide-react';

export function EmptyMetricsState() {
  return (
    <div className="p-8 text-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900">
      <Target className="w-12 h-12 mx-auto mb-4 text-slate-400" />
      <h3 className="text-lg font-semibold mb-2 text-slate-700 dark:text-slate-200">
        Nessuna metrica disponibile
      </h3>
      <p className="text-sm max-w-md mx-auto text-slate-500 dark:text-slate-400">
        Le metriche di successo verranno calcolate dopo alcune sessioni di studio.
        Inizia a interagire con i Professori per vedere i tuoi progressi.
      </p>
    </div>
  );
}

