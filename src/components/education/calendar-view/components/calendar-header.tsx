/**
 * @file calendar-header.tsx
 * @brief Calendar header component
 */

import { Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ViewTab } from '../hooks/use-calendar-view';

interface CalendarHeaderProps {
  onAddClick: () => void;
  activeTab: ViewTab;
}

export function CalendarHeader({ onAddClick, activeTab }: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Calendar className="w-8 h-8 text-blue-500" />
          Calendario Scolastico
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Pianifica verifiche, compiti e progetti
        </p>
      </div>
      <Button
        onClick={onAddClick}
        className="gap-2"
        disabled={activeTab !== 'calendar'}
      >
        <Plus className="w-4 h-4" />
        Nuovo Evento
      </Button>
    </div>
  );
}

