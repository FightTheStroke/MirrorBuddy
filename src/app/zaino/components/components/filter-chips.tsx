/**
 * @file filter-chips.tsx
 * @brief Filter chips component
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TYPE_FILTERS, CHIP_COLORS } from '../constants';

interface FilterChipsProps {
  typeFilter: string;
  onFilterChange: (type: string) => void;
  getFilterCount: (id: string) => number;
}

export function FilterChips({
  typeFilter,
  onFilterChange,
  getFilterCount,
}: FilterChipsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mb-6"
    >
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        {TYPE_FILTERS.map((filter) => {
          const count = getFilterCount(filter.id);
          const isActive =
            typeFilter === filter.id ||
            (filter.id === 'all' && typeFilter === 'all');
          const colors = CHIP_COLORS[filter.color] || CHIP_COLORS.slate;
          const Icon = filter.icon;

          return (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full border transition-all whitespace-nowrap',
                'min-h-[44px] min-w-[44px]',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                isActive
                  ? colors.activeBg
                  : cn(colors.bg, colors.text, colors.border, 'hover:scale-105')
              )}
              aria-pressed={isActive}
              aria-label={`Filtra per ${filter.label}, ${count} elementi`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              <span className="font-medium">{filter.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full',
                    isActive
                      ? 'bg-white/20'
                      : 'bg-slate-200 dark:bg-slate-700'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

