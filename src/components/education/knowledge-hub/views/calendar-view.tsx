'use client';

/**
 * Calendar View
 * Calendar with materials grouped by day
 *
 * Phase 7: Task 7.12
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MaterialCard } from '../components/material-card';
import { toMaterial, getCalendarDays, WEEKDAYS, MONTHS, type CalendarDay } from './calendar-utils';
import type { KnowledgeHubMaterial } from './explorer-view';

export interface CalendarViewProps {
  materials: KnowledgeHubMaterial[];
  onSelectMaterial: (material: KnowledgeHubMaterial) => void;
  onFindSimilar?: (toolId: string) => void;
  selectedMaterialIds?: Set<string>;
  onToggleMaterialSelection?: (id: string) => void;
  className?: string;
}


export function CalendarView({
  materials,
  onSelectMaterial,
  onFindSimilar,
  selectedMaterialIds = new Set(),
  onToggleMaterialSelection,
  className,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const calendarDays = useMemo(
    () => getCalendarDays(currentDate.year, currentDate.month, materials),
    [currentDate.year, currentDate.month, materials]
  );

  const goToPrevMonth = () => {
    setCurrentDate((prev) => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { ...prev, month: prev.month - 1 };
    });
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    setCurrentDate((prev) => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { ...prev, month: prev.month + 1 };
    });
    setSelectedDay(null);
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedDay(null);
  };

  return (
    <div className={cn('p-4', className)}>
      <div className="flex gap-6">
        {/* Calendar grid */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={goToPrevMonth} aria-label="Mese precedente">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-lg font-semibold min-w-[200px] text-center">
                {MONTHS[currentDate.month]} {currentDate.year}
              </h2>
              <Button variant="ghost" size="icon" onClick={goToNextMonth} aria-label="Mese successivo">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Oggi
            </Button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-slate-500 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => (
              <button
                key={index}
                onClick={() => setSelectedDay(day.materials.length > 0 ? day : null)}
                className={cn(
                  'relative aspect-square p-1 rounded-lg transition-colors text-sm',
                  day.isCurrentMonth
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-400 dark:text-slate-600',
                  day.isToday && 'ring-2 ring-primary',
                  selectedDay?.date.getTime() === day.date.getTime() &&
                    'bg-primary/10',
                  day.materials.length > 0 &&
                    'hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer',
                  day.materials.length === 0 && 'cursor-default'
                )}
                disabled={day.materials.length === 0}
                aria-label={`${day.date.getDate()} ${MONTHS[day.date.getMonth()]}, ${day.materials.length} materiali`}
              >
                <span className="absolute top-1 left-2">{day.date.getDate()}</span>
                {day.materials.length > 0 && (
                  <div className="absolute bottom-1 left-1 right-1 flex gap-0.5 justify-center">
                    {day.materials.slice(0, 3).map((m) => (
                      <span
                        key={m.id}
                        className="w-1.5 h-1.5 rounded-full bg-primary"
                        title={m.title}
                      />
                    ))}
                    {day.materials.length > 3 && (
                      <span className="text-[10px] text-slate-400">
                        +{day.materials.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Selected day materials */}
        <AnimatePresence mode="wait">
          {selectedDay && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-80 flex-shrink-0 border-l border-slate-200 dark:border-slate-700 pl-6"
            >
              <h3 className="font-semibold mb-4">
                {selectedDay.date.getDate()} {MONTHS[selectedDay.date.getMonth()]}
              </h3>
              <div className="space-y-3">
                {selectedDay.materials.map((material: KnowledgeHubMaterial) => (
                  <MaterialCard
                    key={material.id}
                    material={toMaterial(material)}
                    onOpen={() => onSelectMaterial(material)}
                    onFindSimilar={
                      onFindSimilar
                        ? () => onFindSimilar(material.toolId ?? material.id)
                        : undefined
                    }
                    isSelected={selectedMaterialIds.has(material.id)}
                    onSelect={
                      onToggleMaterialSelection
                        ? () => onToggleMaterialSelection(material.id)
                        : undefined
                    }
                    compact
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
