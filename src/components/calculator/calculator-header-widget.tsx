'use client';

import { useRef, useEffect } from 'react';
import { Calculator, ChevronDown, Sigma, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCalculatorStore, type CalculatorMode } from '@/lib/stores/calculator-store';
import { CalculatorSimple } from './calculator-simple';
import { CalculatorScientific } from './calculator-scientific';
import { CalculatorGraph } from './calculator-graph';
import { cn } from '@/lib/utils';
import { useTranslations } from "next-intl";

const MODE_CONFIG: Record<CalculatorMode, { label: string; icon: React.ReactNode }> = {
  simple: { label: 'Semplice', icon: <Calculator className="w-4 h-4" /> },
  scientific: { label: 'Scientifica', icon: <Sigma className="w-4 h-4" /> },
  graph: { label: 'Grafici', icon: <LineChart className="w-4 h-4" /> },
};

export function CalculatorHeaderWidget() {
  const t = useTranslations("common");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { mode, setMode, isOpen, setIsOpen, clear } = useCalculatorStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  // Clear on mode change
  const handleModeChange = (newMode: CalculatorMode) => {
    if (newMode !== mode) {
      clear();
      setMode(newMode);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'h-8 gap-1.5 rounded-full transition-colors',
          isOpen
            ? 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20'
            : 'text-slate-500 hover:text-blue-500 hover:bg-blue-500/10'
        )}
        title={t("calcolatrice")}
      >
        <Calculator className="w-4 h-4" />
        <ChevronDown className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-180')} />
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-3 z-50">
          {/* Mode tabs */}
          <div className="flex gap-1 mb-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {(Object.keys(MODE_CONFIG) as CalculatorMode[]).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-colors',
                  mode === m
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                {MODE_CONFIG[m].icon}
                <span className="hidden sm:inline">{MODE_CONFIG[m].label}</span>
              </button>
            ))}
          </div>

          {/* Calculator content */}
          {mode === 'simple' && <CalculatorSimple />}
          {mode === 'scientific' && <CalculatorScientific />}
          {mode === 'graph' && <CalculatorGraph />}
        </div>
      )}
    </div>
  );
}
