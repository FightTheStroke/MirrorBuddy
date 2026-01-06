import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';

export function EmptyInsightsState() {
  const { settings } = useAccessibilityStore();

  return (
    <div className={cn(
      'p-8 text-center rounded-xl border-2 border-dashed',
      settings.highContrast
        ? 'border-yellow-400 bg-gray-900'
        : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900'
    )}>
      <Users className={cn(
        'w-12 h-12 mx-auto mb-4',
        settings.highContrast ? 'text-yellow-400' : 'text-slate-400'
      )} />
      <h3 className={cn(
        'text-lg font-semibold mb-2',
        settings.highContrast ? 'text-yellow-400' : 'text-slate-700 dark:text-slate-200'
      )}>
        Nessun dato disponibile
      </h3>
      <p className={cn(
        'text-sm max-w-md mx-auto',
        settings.highContrast ? 'text-white' : 'text-slate-500 dark:text-slate-400'
      )}>
        Il profilo dello studente verrà generato dopo alcune sessioni di studio con i Professori.
        Torna più tardi per vedere le osservazioni e i suggerimenti personalizzati.
      </p>
    </div>
  );
}

