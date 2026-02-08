/**
 * @file filter-chips.tsx
 * @brief Filter component with toggle switches for multi-select
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { TYPE_FILTERS, CHIP_COLORS, DATE_FILTERS } from '../constants';
import { SUBJECT_LABELS } from '@/components/education/archive';
import { useFilterDropdown } from './use-filter-dropdown';

interface FilterChipsProps {
  typeFilter: string;
  dateFilter: string;
  subjectFilter: string | null;
  subjects: string[];
  onTypeFilterChange: (type: string) => void;
  onDateFilterChange: (date: string) => void;
  onSubjectFilterChange: (subject: string | null) => void;
  getTypeFilterCount: (id: string) => number;
  getSubjectFilterCount: (id: string) => number;
  getDateFilterCount: (id: string) => number;
}

export function FilterChips({
  typeFilter,
  dateFilter,
  subjectFilter,
  subjects,
  onTypeFilterChange,
  onDateFilterChange,
  onSubjectFilterChange,
  getTypeFilterCount,
  getSubjectFilterCount,
  getDateFilterCount,
}: FilterChipsProps) {
  const t = useTranslations('education.supporti.filters');
  const [showSubjects, setShowSubjects] = useState(true);
  const { showMoreTypes, setShowMoreTypes, dropdownPosition, moreTypesRef } = useFilterDropdown();

  const visibleTypes = TYPE_FILTERS.slice(0, 5).filter((f) => getTypeFilterCount(f.id) > 0);
  const moreTypes = TYPE_FILTERS.slice(5)
    .filter((f) => getTypeFilterCount(f.id) > 0)
    .map((f) => ({ ...f, count: getTypeFilterCount(f.id) }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Tipo di materiale
        </h3>
        <div className="flex flex-wrap gap-2">
          {visibleTypes.map((filter) => {
            const count = getTypeFilterCount(filter.id);
            const isActive =
              typeFilter === filter.id || (filter.id === 'all' && typeFilter === 'all');
            const colors = CHIP_COLORS[filter.color] || CHIP_COLORS.slate;
            const Icon = filter.icon;

            return (
              <button
                key={filter.id}
                onClick={() => onTypeFilterChange(filter.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                  isActive ? colors.activeBg : cn(colors.bg, colors.text, colors.border),
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{filter.label}</span>
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    isActive ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-600',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {moreTypes.length > 0 && (
            <div className="relative" ref={moreTypesRef}>
              <button
                onClick={() => setShowMoreTypes(!showMoreTypes)}
                className={cn(
                  'flex items-center gap-1 px-3 py-2 rounded-lg border text-sm transition-all',
                  'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
                  showMoreTypes && 'ring-2 ring-primary',
                )}
              >
                Altro
                {showMoreTypes ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              <AnimatePresence>
                {showMoreTypes && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="fixed bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-600 shadow-2xl z-[9999] overflow-hidden"
                    style={{
                      top: dropdownPosition.top,
                      left: dropdownPosition.left,
                    }}
                  >
                    {moreTypes.map((filter) => {
                      const isActive = typeFilter === filter.id;
                      const colors = CHIP_COLORS[filter.color] || CHIP_COLORS.slate;
                      const Icon = filter.icon;

                      return (
                        <button
                          key={filter.id}
                          onClick={() => {
                            onTypeFilterChange(filter.id);
                            setShowMoreTypes(false);
                          }}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                            isActive
                              ? colors.activeBg
                              : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200',
                          )}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="flex-1 text-left">{filter.label}</span>
                          {isActive && <Check className="w-4 h-4" />}
                          <span className="text-xs text-muted-foreground ml-2">{filter.count}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Periodo
        </h3>
        <div className="flex flex-wrap gap-2">
          {DATE_FILTERS.map((filter) => {
            const count = getDateFilterCount(filter.id);
            const isActive =
              dateFilter === filter.id || (filter.id === 'all' && dateFilter === 'all');
            const colors = CHIP_COLORS[filter.color] || CHIP_COLORS.slate;

            return (
              <button
                key={filter.id}
                onClick={() => onDateFilterChange(filter.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                  isActive
                    ? colors.activeBg
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
                )}
              >
                <span>{filter.label}</span>
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    isActive ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-600',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {subjects.length > 0 && (
        <div>
          <button
            onClick={() => setShowSubjects(!showSubjects)}
            className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            {t('subjectLabel')}
            {showSubjects ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {showSubjects && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onSubjectFilterChange(null)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                      !subjectFilter
                        ? 'bg-emerald-500 dark:bg-emerald-400 text-white dark:text-emerald-950 border-emerald-500 dark:border-emerald-400'
                        : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700',
                    )}
                  >
                    <span>Tutte</span>
                  </button>
                  {subjects.map((subject) => {
                    const count = getSubjectFilterCount(subject);
                    const isActive = subjectFilter === subject;

                    return (
                      <button
                        key={subject}
                        onClick={() => onSubjectFilterChange(subject)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                          isActive
                            ? 'bg-emerald-500 dark:bg-emerald-400 text-white dark:text-emerald-950 border-emerald-500 dark:border-emerald-400'
                            : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700',
                        )}
                      >
                        <span className="w-5 h-5 rounded-full bg-emerald-200 dark:bg-emerald-600 flex items-center justify-center text-xs font-bold">
                          {subject.charAt(0).toUpperCase()}
                        </span>
                        <span>{SUBJECT_LABELS[subject] || subject}</span>
                        <span
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded',
                            isActive ? 'bg-white/20' : 'bg-emerald-200 dark:bg-emerald-600',
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
