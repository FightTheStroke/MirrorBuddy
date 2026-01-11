/**
 * @file calendar-header.tsx
 * @brief Calendar header component
 */

import { Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import type { ViewTab } from '../hooks/use-calendar-view';

interface CalendarHeaderProps {
  onAddClick: () => void;
  activeTab: ViewTab;
}

export function CalendarHeader({ onAddClick, activeTab }: CalendarHeaderProps) {
  return (
    <PageHeader
      icon={Calendar}
      title="Calendario"
      rightContent={
        <Button
          onClick={onAddClick}
          className="gap-2"
          disabled={activeTab !== 'calendar'}
        >
          <Plus className="w-4 h-4" />
          Nuovo Evento
        </Button>
      }
    />
  );
}

