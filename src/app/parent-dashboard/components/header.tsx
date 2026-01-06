/**
 * @file header.tsx
 * @brief Header component for parent dashboard
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, AlertCircle } from 'lucide-react';

interface ConsentStatus {
  parentConsent: boolean;
  studentConsent: boolean;
}

interface HeaderProps {
  consentStatus: ConsentStatus | null;
}

export function Header({ consentStatus }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Link href="/">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Torna all&apos;app</span>
            <span className="sm:hidden">Indietro</span>
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100">
            Dashboard Genitori
          </h1>
        </div>
        {consentStatus && (
          <div className="flex items-center gap-2 shrink-0">
            {consentStatus.parentConsent && consentStatus.studentConsent ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                <Shield className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-green-700 dark:text-green-300 hidden sm:inline">
                  Consenso attivo
                </span>
                <span className="text-xs font-medium text-green-700 dark:text-green-300 sm:hidden">
                  Attivo
                </span>
              </div>
            ) : consentStatus.parentConsent ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300 hidden sm:inline">
                  Parziale
                </span>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </header>
  );
}

