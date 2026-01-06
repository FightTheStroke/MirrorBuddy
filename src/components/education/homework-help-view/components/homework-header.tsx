import { History, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Maestro } from '@/types';

interface HomeworkHeaderProps {
  connectedMaestro: Maestro | null;
  hasCurrentHomework: boolean;
  historyCount: number;
  showHistory: boolean;
  onNewProblem: () => void;
  onToggleHistory: () => void;
}

export function HomeworkHeader({
  connectedMaestro,
  hasCurrentHomework,
  historyCount,
  showHistory,
  onNewProblem,
  onToggleHistory,
}: HomeworkHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Materiali di Studio
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Metodo maieutico: ti guido a trovare la soluzione da solo
        </p>
        {connectedMaestro && (
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: connectedMaestro.color }}
            >
              {connectedMaestro.avatar}
            </div>
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Con {connectedMaestro.name}
            </span>
            <GraduationCap className="w-4 h-4 text-blue-500" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {hasCurrentHomework && (
          <Button variant="outline" onClick={onNewProblem}>
            Nuovo problema
          </Button>
        )}
        <Button
          variant="outline"
          onClick={onToggleHistory}
          className={cn(showHistory && 'bg-slate-100 dark:bg-slate-800')}
        >
          <History className="w-4 h-4 mr-2" />
          Cronologia ({historyCount})
        </Button>
      </div>
    </div>
  );
}

