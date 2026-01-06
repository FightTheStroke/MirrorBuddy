/**
 * @file loading-view.tsx
 * @brief Loading view component
 */

import { Loader2 } from 'lucide-react';

export function LoadingView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      <p className="text-slate-600 dark:text-slate-400">
        Caricamento profilo...
      </p>
    </div>
  );
}

