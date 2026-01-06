/**
 * @file tab-navigation.tsx
 * @brief Tab navigation component
 */

import { Calendar, CalendarDays, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ViewTab } from '../hooks/use-calendar-view';

interface TabNavigationProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
      <button
        onClick={() => onTabChange('calendar')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
          activeTab === 'calendar'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        )}
      >
        <Calendar className="w-4 h-4" />
        Eventi
      </button>
      <button
        onClick={() => onTabChange('schedule')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
          activeTab === 'schedule'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        )}
      >
        <CalendarDays className="w-4 h-4" />
        Piano Settimanale
      </button>
      <button
        onClick={() => onTabChange('notifications')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
          activeTab === 'notifications'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        )}
      >
        <Bell className="w-4 h-4" />
        Notifiche
      </button>
    </div>
  );
}

