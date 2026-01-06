/**
 * @file filter-chips.tsx
 * @brief Simplified filter component with portal dropdown
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TYPE_FILTERS, CHIP_COLORS, DATE_FILTERS } from '../constants';
import { SUBJECT_LABELS } from '@/components/education/archive';

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
}

function MoreTypesMenu({ 
  anchorRef, 
  items, 
  onSelect, 
  onClose 
}: { 
  anchorRef: React.RefObject<HTMLDivElement | null>;
  items: Array<{ id: string; label: string; count: number }>;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function updatePosition() {
      if (anchorRef.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        setPosition({ top: rect.bottom + 4, left: rect.left });
      }
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [anchorRef, onClose]);

  if (!position) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15 }}
        className="fixed bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-600 shadow-2xl z-[9999] overflow-hidden"
        style={{
          top: position?.top ?? 0,
          left: position?.left ?? 0,
          minWidth: 180,
        }}
      >
        {items.map((item) => {
          const filter = TYPE_FILTERS.find(t => t.id === item.id);
          const Icon = filter?.icon || (() => null);

          return (
            <button
              key={item.id}
              onClick={() => {
                onSelect(item.id);
                onClose();
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              <span className="text-xs text-muted-foreground">{item.count}</span>
            </button>
          );
        })}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
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
}: FilterChipsProps) {
  const [showMoreTypes, setShowMoreTypes] = useState(false);
  const [showSubjects, setShowSubjects] = useState(true);
  const moreTypesRef = useRef<HTMLDivElement>(null);

  const activeCount = [
    typeFilter !== 'all',
    dateFilter !== 'all',
    subjectFilter !== null,
  ].filter(Boolean).length;

  const visibleTypes = TYPE_FILTERS.slice(0, 5).filter(f => getTypeFilterCount(f.id) > 0);
  const moreTypes = TYPE_FILTERS.slice(5)
    .filter(f => getTypeFilterCount(f.id) > 0)
    .map(f => ({ id: f.id, label: f.label, count: getTypeFilterCount(f.id) }));

  return (
    <div className="space-y-4 relative">
      {activeCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {typeFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-sm">
              {TYPE_FILTERS.find(t => t.id === typeFilter)?.label}
              <button onClick={() => onTypeFilterChange('all')} className="hover:bg-slate-300 dark:hover:bg-slate-600 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {dateFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-sm">
              {DATE_FILTERS.find(d => d.id === dateFilter)?.label}
              <button onClick={() => onDateFilterChange('all')} className="hover:bg-slate-300 dark:hover:bg-slate-600 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {subjectFilter !== null && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-200 dark:bg-emerald-700 text-sm text-emerald-800 dark:text-emerald-200">
              {SUBJECT_LABELS[subjectFilter] || subjectFilter}
              <button onClick={() => onSubjectFilterChange(null)} className="hover:bg-emerald-300 dark:hover:bg-emerald-600 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {activeCount > 1 && (
            <button
              onClick={() => {
                onTypeFilterChange('all');
                onDateFilterChange('all');
                onSubjectFilterChange(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Resetta
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        {visibleTypes.map((filter) => {
          const count = getTypeFilterCount(filter.id);
          const isActive = typeFilter === filter.id || (filter.id === 'all' && typeFilter === 'all');
          const colors = CHIP_COLORS[filter.color] || CHIP_COLORS.slate;
          const Icon = filter.icon;

          return (
            <button
              key={filter.id}
              onClick={() => onTypeFilterChange(filter.id)}
              className={cn(
                'flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all',
                isActive
                  ? colors.activeBg
                  : cn(colors.bg, colors.text, colors.border)
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{filter.label}</span>
              <span className={cn('text-xs px-1.5 py-0.5 rounded', isActive ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-600')}>
                {count}
              </span>
            </button>
          );
        })}

        {moreTypes.length > 0 && (
          <div className="relative flex-shrink-0" ref={moreTypesRef}>
            <button
              onClick={() => setShowMoreTypes(!showMoreTypes)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm transition-all',
                showMoreTypes
                  ? 'bg-slate-200 dark:bg-slate-700 border-slate-400 dark:border-slate-500'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              )}
            >
              Altro
              {showMoreTypes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showMoreTypes && (
              <MoreTypesMenu
                anchorRef={moreTypesRef}
                items={moreTypes}
                onSelect={onTypeFilterChange}
                onClose={() => setShowMoreTypes(false)}
              />
            )}
          </div>
        )}

        <div className="w-px h-8 bg-slate-300 dark:bg-slate-600 flex-shrink-0" />

        {DATE_FILTERS.slice(0, 4).map((filter) => {
          const isActive = dateFilter === filter.id || (filter.id === 'all' && dateFilter === 'all');
          const colors = CHIP_COLORS[filter.color] || CHIP_COLORS.slate;

          return (
            <button
              key={filter.id}
              onClick={() => onDateFilterChange(filter.id)}
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-lg border text-sm transition-all',
                isActive
                  ? colors.activeBg
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              )}
            >
              {filter.label}
            </button>
          );
        })}

        {subjects.length > 0 && (
          <>
            <div className="w-px h-8 bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
            
            <button
              onClick={() => setShowSubjects(!showSubjects)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm transition-all',
                showSubjects
                  ? 'bg-emerald-100 dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300'
                  : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
              )}
            >
              Materie
              {showSubjects ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </>
        )}
      </div>

      <AnimatePresence>
        {showSubjects && subjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 pt-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
              <button
                onClick={() => onSubjectFilterChange(null)}
                className={cn(
                  'flex-shrink-0 px-3 py-1.5 rounded-lg border text-sm transition-all',
                  !subjectFilter
                    ? 'bg-emerald-500 dark:bg-emerald-400 text-white dark:text-emerald-950 border-emerald-500 dark:border-emerald-400'
                    : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
                )}
              >
                Tutte
              </button>
              {subjects.map((subject) => {
                const count = getSubjectFilterCount(subject);
                const isActive = subjectFilter === subject;

                return (
                  <button
                    key={subject}
                    onClick={() => onSubjectFilterChange(subject)}
                    className={cn(
                      'flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all',
                      isActive
                        ? 'bg-emerald-500 dark:bg-emerald-400 text-white dark:text-emerald-950 border-emerald-500 dark:border-emerald-400'
                        : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
                    )}
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-200 dark:bg-emerald-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {subject.charAt(0).toUpperCase()}
                    </span>
                    <span>{SUBJECT_LABELS[subject] || subject}</span>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded', isActive ? 'bg-white/20' : 'bg-emerald-200 dark:bg-emerald-600')}>
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
  );
}
